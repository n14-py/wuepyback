// ==========================================================================
// WUEPY.COM - CONTROLADOR DE AUTENTICACIÓN (API REST)
// ==========================================================================
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken'); // <-- AGREGADO PARA SOPORTE MÓVIL (TOKEN)

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

            // Ya lo validamos en el front, pero por seguridad lo re-validamos en el back
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

            // Crear el nuevo usuario (CORREGIDO PARA QUE COINCIDA CON TU MODELO USER.JS)
            const newUser = new User({ 
                name: name.trim(), 
                email: emailClean, 
                password: hashedPassword,
                role: 'store_owner', // CORRECCIÓN CRÍTICA: En lugar de 'dueño'
                accountStatus: 'active' // Coincide con el modelo
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
                return res.status(401).json({ success: false, message: info ? info.message : 'Credenciales inválidas.' });
            }
            
            // Establecer la sesión
            req.logIn(user, (err) => {
                if (err) {
                    console.error("Error al iniciar sesión:", err);
                    return res.status(500).json({ success: false, message: 'Error al establecer la sesión.' });
                }
                
                // GENERAR TOKEN JWT PARA MÓVILES (Bypass de bloqueo de cookies cross-site)
                const token = jwt.sign(
                    { id: user._id, role: user.role, isEmployee: user.isEmployee, siteId: user.siteId }, 
                    process.env.JWT_SECRET || 'wuepy_super_secret_key_2026', 
                    { expiresIn: '30d' }
                );

                // Login exitoso, enviamos los datos básicos del usuario y el token
                const userData = {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: token // <-- INYECTAMOS EL TOKEN AQUÍ
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
            // Limpiar la cookie
            res.clearCookie('connect.sid'); 
            return res.status(200).json({ success: true, message: 'Has cerrado sesión correctamente.' });
        });
    },

    // ==========================================
    // 4. VERIFICAR SESIÓN ACTIVA
    // ==========================================
    checkSession: async (req, res) => {
        let currentUser = null;

        // 1. Verificamos si hay sesión tradicional por Cookie (Escritorio)
        if (req.isAuthenticated()) {
            currentUser = req.user;
        } 
        // 2. Si no hay cookie (caso celular), verificamos el Token
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            const token = req.headers.authorization.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wuepy_super_secret_key_2026');
                currentUser = await User.findById(decoded.id);
            } catch (err) {
                // Token inválido o expirado
            }
        }

        if (currentUser) {
            const userData = {
                id: currentUser._id,
                name: currentUser.name,
                email: currentUser.email,
                role: currentUser.role
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