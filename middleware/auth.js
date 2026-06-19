// ==========================================================================
// WUEPY.COM - MIDDLEWARE DE SEGURIDAD (API REST)
// ==========================================================================
module.exports = {
    // ==========================================
    // 1. NIVEL BASE (Solo logueados)
    // ==========================================
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) return next();
        return res.status(401).json({ success: false, message: 'Por favor inicia sesión para acceder.', errorCode: 'AUTH_REQUIRED' });
    },

    // ==========================================
    // 2. NIVEL INVITADO
    // ==========================================
    ensureGuest: function(req, res, next) {
        if (!req.isAuthenticated()) return next();
        return res.status(403).json({ success: false, message: 'Ya tienes una sesión activa.', errorCode: 'ALREADY_LOGGED_IN' });
    },

    // ==========================================
    // 3. NIVEL DUEÑO DE TIENDA
    // ==========================================
    ensureStoreOwner: function(req, res, next) {
        if (req.isAuthenticated() && req.user.isOwner) return next();
        return res.status(403).json({ success: false, message: 'Acceso denegado. Función exclusiva para dueños de tienda.', errorCode: 'OWNER_REQUIRED' });
    },

    // ==========================================
    // 4. NIVEL SÚPER ADMIN
    // ==========================================
    ensureSuperAdmin: function(req, res, next) {
        if (req.isAuthenticated() && req.user.isOwner && req.user.role === 'superadmin') return next();
        return res.status(403).json({ success: false, message: 'Acceso restringido. Solo Super Administradores.', errorCode: 'SUPERADMIN_REQUIRED' });
    },

    // ==========================================
    // 5. CANDADO POR SUCURSAL (BLINDADO ANTI-CRASH)
    // ==========================================
    ensureSiteAccess: function(req, res, next) {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ success: false, message: 'Por favor inicia sesión.', errorCode: 'AUTH_REQUIRED' });
        }

        const requestedSiteId = req.params.siteId || req.params.id || req.body.siteId || req.query.siteId;

        if (!requestedSiteId) {
            console.error("⚠️ [Auth API] ensureSiteAccess llamado en ruta sin ID de tienda.");
            return res.status(400).json({ success: false, message: 'ID de tienda no proporcionado en la petición.', errorCode: 'MISSING_SITE_ID' });
        }

        if (req.user.isOwner) {
            return next();
        }

        if (req.user.isEmployee) {
            if (req.user.siteId && req.user.siteId.toString() === requestedSiteId.toString()) {
                return next();
            } else {
                return res.status(403).json({ success: false, message: 'Alerta de Seguridad: No tienes permisos en esta sucursal.', errorCode: 'WRONG_BRANCH' });
            }
        }

        return res.status(403).json({ success: false, message: 'Permisos insuficientes.', errorCode: 'ACCESS_DENIED' });
    }
};