// ==========================================================================
// WUEPY.COM - RUTAS DE AUTENTICACIÓN (API)
// ==========================================================================
const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');

// ==========================================
// 1. RUTAS DE AUTENTICACIÓN LOCAL (Email/Contraseña)
// ==========================================

// POST: Crear cuenta de Dueño/Usuario
router.post('/register', authController.postRegister);

// POST: Iniciar sesión
router.post('/login', authController.postLogin);

// GET o POST: Cerrar sesión
router.get('/logout', authController.logout);
router.post('/logout', authController.logout); // Soportamos POST también por si Flutter lo prefiere

// GET: Verificar si la sesión está activa (Para que la app no pida login cada vez)
router.get('/session', authController.checkSession);

// ==========================================
// 2. RUTAS DE GOOGLE OAUTH2
// ==========================================

// GET: Inicia el flujo de autenticación con Google
// Se dispara cuando el usuario hace clic en el botón de "Continuar con Google" en tu Frontend
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

// GET: El Callback de Google (Aquí regresa Google después de que el usuario acepta)
router.get('/google/callback', 
    passport.authenticate('google', { 
        // Si hay error, lo devolvemos al login del frontend en Cloudflare con un aviso
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
        session: true 
    }),
    (req, res) => {
        // ¡Login exitoso! 
        // Como estamos separados, el backend no muestra una vista, sino que redirige al usuario 
        // de vuelta a tu frontend (Cloudflare) directamente a su dashboard.
        // Las cookies de sesión ya van incrustadas gracias a nuestra configuración anterior.
        res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    }
);

module.exports = router;