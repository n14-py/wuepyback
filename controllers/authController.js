const passport = require('passport');
const User = require('../models/User');

module.exports = {
    // Renderizar formularios
    getLogin: (req, res) => res.render('auth/login', { title: 'Iniciar Sesión' }),
    getRegister: (req, res) => res.render('auth/register', { title: 'Crear Cuenta' }),

    // Procesar Registro
    postRegister: async (req, res) => {
        try {
            const { username, email, password, confirmPassword } = req.body;

            if (password !== confirmPassword) {
                req.flash('error_msg', 'Las contraseñas no coinciden');
                return res.redirect('/register');
            }

            // Verificar si existe
            let user = await User.findOne({ email: email.toLowerCase() });
            if (user) {
                req.flash('error_msg', 'El correo ya está registrado');
                return res.redirect('/register');
            }

            // Crear usuario
            const newUser = new User({ username, email, password });
            await newUser.save();

            req.flash('success_msg', 'Cuenta creada. Ahora inicia sesión.');
            res.redirect('/login');
        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Error en el registro');
            res.redirect('/register');
        }
    },

    // Procesar Login
    postLogin: (req, res, next) => {
        passport.authenticate('local', {
            successRedirect: '/dashboard',
            failureRedirect: '/login',
            failureFlash: true
        })(req, res, next);
    },

    // Cerrar Sesión
    logout: (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            req.flash('success_msg', 'Sesión cerrada exitosamente');
            res.redirect('/login');
        });
    }
};