// ==========================================================================
// WUEPY.COM - MIDDLEWARE DE SEGURIDAD (API REST)
// ==========================================================================
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Aseguramos traer el modelo para cargar el usuario

// Función auxiliar HÍBRIDA: Revisa primero la Cookie (PC) y luego el Token (Móvil)
const checkAuth = async (req) => {
    // 1. Verificación tradicional por Cookie (Escritorio)
    if (req.isAuthenticated()) {
        return req.user;
    }
    
    // 2. Verificación por JWT Token (Celulares / Cross-Domain)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wuepy_super_secret_key_2026');
            // Buscamos al usuario en la base de datos para que actúe igual que req.user tradicional
            const user = await User.findById(decoded.id);
            return user;
        } catch (err) {
            console.warn("[Auth Middleware] Token inválido o expirado.");
            return null;
        }
    }
    return null;
};

module.exports = {
    // ==========================================
    // 1. NIVEL BASE (Solo logueados)
    // ==========================================
    ensureAuthenticated: async function(req, res, next) {
        const user = await checkAuth(req);
        if (user) {
            req.user = user; // Inyectamos el usuario en la request para que el backend lo reconozca
            return next();
        }
        return res.status(401).json({ success: false, message: 'Por favor inicia sesión para acceder.', errorCode: 'AUTH_REQUIRED' });
    },

    // ==========================================
    // 2. NIVEL INVITADO
    // ==========================================
    ensureGuest: async function(req, res, next) {
        const user = await checkAuth(req);
        if (!user) return next();
        return res.status(403).json({ success: false, message: 'Ya tienes una sesión activa.', errorCode: 'ALREADY_LOGGED_IN' });
    },

    // ==========================================
    // 3. NIVEL DUEÑO DE TIENDA
    // ==========================================
    ensureStoreOwner: async function(req, res, next) {
        const user = await checkAuth(req);
        if (user && (user.role === 'store_owner' || user.role === 'superadmin')) {
            req.user = user;
            return next();
        }
        return res.status(403).json({ success: false, message: 'Acceso denegado. Función exclusiva para dueños de tienda.', errorCode: 'OWNER_REQUIRED' });
    },

    // ==========================================
    // 4. NIVEL SÚPER ADMIN
    // ==========================================
    ensureSuperAdmin: async function(req, res, next) {
        const user = await checkAuth(req);
        if (user && user.role === 'superadmin') {
            req.user = user;
            return next();
        }
        return res.status(403).json({ success: false, message: 'Acceso restringido. Solo Super Administradores.', errorCode: 'SUPERADMIN_REQUIRED' });
    },

    // ==========================================
    // 5. CANDADO POR SUCURSAL (BLINDADO ANTI-CRASH)
    // ==========================================
    ensureSiteAccess: async function(req, res, next) {
        const user = await checkAuth(req);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Por favor inicia sesión.', errorCode: 'AUTH_REQUIRED' });
        }
        
        req.user = user; // Inyectamos el usuario seguro

        const requestedSiteId = req.params.siteId || req.params.id || req.body.siteId || req.query.siteId;

        if (!requestedSiteId) {
            console.error("⚠️ [Auth API] ensureSiteAccess llamado en ruta sin ID de tienda.");
            return res.status(400).json({ success: false, message: 'ID de tienda no proporcionado en la petición.', errorCode: 'MISSING_SITE_ID' });
        }

        // Si es el dueño de la tienda o un súper administrador, pasa directo
        if (user.role === 'store_owner' || user.role === 'superadmin') {
            return next();
        }

        // Si es un empleado, verificamos si pertenece a la sucursal exacta a la que intenta entrar
        if (user.isEmployee) {
            if (user.siteId && user.siteId.toString() === requestedSiteId.toString()) {
                return next();
            } else {
                return res.status(403).json({ success: false, message: 'Alerta de Seguridad: No tienes permisos en esta sucursal.', errorCode: 'WRONG_BRANCH' });
            }
        }

        return res.status(403).json({ success: false, message: 'Permisos insuficientes.', errorCode: 'ACCESS_DENIED' });
    }
};