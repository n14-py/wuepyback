module.exports = {
    // Verificar si el usuario está logueado
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Por favor inicia sesión para ver este recurso');
        res.redirect('/login');
    },

    // Verificar si el usuario es "Invitado" (para login/registro)
    ensureGuest: function(req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        }
        res.redirect('/dashboard');
    },

    // Verificar si es Admin (para panel de control global)
    ensureAdmin: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'admin') {
            return next();
        }
        req.flash('error_msg', 'No tienes permisos de administrador');
        res.redirect('/dashboard');
    },

    // Middleware especial para detectar Subdominios (tiendayankee.lfaftech.com)
    checkSubdomain: function(req, res, next) {
        const host = req.headers.host;
        const mainDomain = process.env.MAIN_DOMAIN || 'localhost:3000';
        
        // Si estamos en el dominio principal, seguimos normal
        if (host === mainDomain || host.startsWith('www.')) {
            req.isMainDomain = true;
            return next();
        }

        // Si es un subdominio, extraemos el nombre (ej: tiendayankee)
        const subdomain = host.split('.')[0];
        req.subdomainName = subdomain;
        req.isMainDomain = false;
        next();
    }
};