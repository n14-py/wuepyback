// ==========================================================================
// WUEPY.COM - CONTROLADOR DE AUTENTICACIÓN (API REST)
// ==========================================================================
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = {
    // ==========================================
    // 1. REGISTRO (API)
    // ==========================================
    postRegister: async (req, res) => {
        try {
            const { name, email, password, confirmPassword } = req.body;

            // Validaciones básicas
            if (!name || !email || !password) {
                return res.status(400).json({ success: false, message: 'Por favor completa todos los campos.' });
            }

            if (password !== confirmPassword) {
                return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden.' });
            }

            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
            }

            const emailClean = email.toLowerCase().trim();
            let userExists = await User.findOne({ email: emailClean });
            
            if (userExists) {
                return res.status(400).json({ success: false, message: 'Este correo ya está registrado en la plataforma.' });
            }

            // Encriptar la contraseña
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Crear el nuevo usuario
            const newUser = new User({ 
                name: name.trim(), 
                email: emailClean, 
                password: hashedPassword,
                role: 'dueño', // Rol por defecto
                plan: 'free',
                status: 'active'
            });

            await newUser.save();

            return res.status(201).json({ 
                success: true, 
                message: '¡Cuenta creada con éxito! Ahora puedes iniciar sesión.' 
            });

        } catch (error) {
            console.error('Error en el registro API:', error);
            return res.status(500).json({ success: false, message: 'Ocurrió un error interno durante el registro.' });
        }
    },

    // ==========================================
    // 2. LOGIN TRADICIONAL (API)
    // ==========================================
    postLogin: (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) {
                console.error("Error en login:", err);
                return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
            }
            if (!user) {
                // info.message viene directamente de passport.js que configuramos antes
                return res.status(401).json({ success: false, message: info ? info.message : 'Credenciales inválidas.' });
            }
            
            // Establecer la sesión
            req.logIn(user, (err) => {
                if (err) {
                    console.error("Error al iniciar sesión:", err);
                    return res.status(500).json({ success: false, message: 'Error al establecer la sesión.' });
                }
                
                // Login exitoso, enviamos los datos básicos del usuario (jamás la contraseña)
                const userData = {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar
                };
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Inicio de sesión exitoso.', 
                    user: userData 
                });
            });
        })(req, res, next);
    },

    // ==========================================
    // 3. CERRAR SESIÓN (API)
    // ==========================================
    logout: (req, res, next) => {
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error al cerrar sesión.' });
            }
            // Limpiar la cookie del navegador o dispositivo
            res.clearCookie('connect.sid'); 
            return res.status(200).json({ success: true, message: 'Has cerrado sesión correctamente.' });
        });
    },

    // ==========================================
    // 4. VERIFICAR SESIÓN ACTIVA (Vital para Flutter y Cloudflare)
    // ==========================================
    checkSession: (req, res) => {
        if (req.isAuthenticated()) {
            const userData = {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                avatar: req.user.avatar,
                plan: req.user.plan
            };
            return res.status(200).json({ 
                success: true, 
                isAuthenticated: true, 
                user: userData 
            });
        } else {
            return res.status(401).json({ 
                success: false, 
                isAuthenticated: false, 
                message: 'No hay sesión activa.' 
            });
        }
    }
};