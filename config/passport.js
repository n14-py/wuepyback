const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Crearemos este modelo pronto

module.exports = function(passport) {
    // --- ESTRATEGIA LOCAL (Email/Pass) ---
    passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) return done(null, false, { message: 'Ese correo no está registrado.' });
            
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return done(null, false, { message: 'Contraseña incorrecta.' });

            return done(null, user);
        } catch (err) { return done(err); }
    }));

    // --- ESTRATEGIA GOOGLE ---
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BASE_URL}/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Verificar si el usuario ya existe
            let user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
                // Si existe pero no tenía Google ID, se lo agregamos
                if (!user.googleId) {
                    user.googleId = profile.id;
                    await user.save();
                }
                return done(null, user);
            } else {
                // Crear nuevo usuario
                const newUser = new User({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
                    profilePic: profile.photos[0].value,
                    isVerifiedEmail: true // Google ya verifica el email
                });
                await newUser.save();
                return done(null, newUser);
            }
        } catch (err) { return done(err, null); }
    }));

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) { done(err); }
    });
};