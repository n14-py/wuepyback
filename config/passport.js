// ==========================================================================
// WUEPY.COM - NÚCLEO DE AUTENTICACIÓN (PASSPORT.JS)
// ==========================================================================
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs'); // Usamos bcryptjs para comparar contraseñas
const User = require('../models/User'); // Importamos el modelo de usuario

module.exports = function(passport) {
    
    // ==========================================
    // 1. ESTRATEGIA LOCAL (Email y Contraseña)
    // ==========================================
    passport.use(new LocalStrategy({ 
        usernameField: 'email',
        passwordField: 'password'
    }, async (email, password, done) => {
        try {
            // Buscar al usuario por su correo
            const user = await User.findOne({ email: email });
            
            // Si el correo no existe
            if (!user) {
                return done(null, false, { message: 'El correo electrónico no está registrado en Wuepy.' });
            }

            // Prevención: Si el usuario se registró con Google y nunca configuró contraseña local
            if (!user.password) {
                return done(null, false, { message: 'Este usuario se registró usando Google. Por favor, usa el botón de Iniciar sesión con Google.' });
            }

            // Verificar si la contraseña coincide
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (isMatch) {
                return done(null, user); // Autenticación exitosa
            } else {
                return done(null, false, { message: 'La contraseña es incorrecta.' });
            }
        } catch (err) {
            console.error('❌ Error fatal en LocalStrategy:', err);
            return done(err);
        }
    }));

    // ==========================================
    // 2. ESTRATEGIA DE GOOGLE OAUTH2
    // ==========================================
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        passReqToCallback: true // Nos permite leer el request si lo necesitamos
    },
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            // 1. Buscar si el usuario ya existe usando su ID único de Google
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                // El usuario ya existe y ya ha entrado con Google antes
                return done(null, user);
            }

            // 2. Si no existe por Google ID, buscar si ya hay un usuario registrado con ese mismo correo
            const email = profile.emails[0].value;
            let existingUser = await User.findOne({ email: email });

            if (existingUser) {
                // El correo ya existe (se registró manual). Lo vinculamos con su cuenta de Google.
                existingUser.googleId = profile.id;
                
                // Si no tenía foto de perfil, le ponemos la de Google
                if (!existingUser.avatar) {
                    existingUser.avatar = profile.photos[0].value;
                }
                
                await existingUser.save();
                return done(null, existingUser);
            }

            // 3. Si es un usuario completamente nuevo, le creamos su cuenta en Wuepy
            const newUser = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: email,
                avatar: profile.photos[0].value,
                role: 'dueño', // Por defecto los que se registran son dueños
                plan: 'free',  // Plan gratuito por defecto
                status: 'active'
            });

            await newUser.save();
            return done(null, newUser);

        } catch (err) {
            console.error('❌ Error fatal en GoogleStrategy:', err);
            return done(err, false);
        }
    }));

    // ==========================================
    // 3. SERIALIZACIÓN Y DESERIALIZACIÓN
    // (Esto mantiene la sesión activa en la base de datos)
    // ==========================================
// ==========================================
    // 3. SERIALIZACIÓN Y DESERIALIZACIÓN
    // ==========================================
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            // FIX: Si viene una sesión antigua con formato { id: '...', type: '...' }, extraemos solo el ID.
            // Si es un ID normal (string), lo usamos tal cual.
            const userId = (id && typeof id === 'object' && id.id) ? id.id : id;
            
            const user = await User.findById(userId);
            done(null, user);
        } catch (err) {
            console.error('❌ Error al deserializar usuario:', err);
            done(err, null);
        }
    });
};