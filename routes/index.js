const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');

// Importar sub-rutas
const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');

// --- RUTAS DEL SUBDOMINIO (TIENDAS PÚBLICAS) ---
// Este middleware captura el tráfico ANTES de llegar a las rutas normales
router.use(async (req, res, next) => {
    // Si NO es el dominio principal y tiene subdominio, es una tienda
    if (!req.isMainDomain && req.subdomainName) {
        
        // 1. Ruta: Home de la Tienda (/)
        if (req.path === '/') {
            return siteController.renderStoreHome(req, res);
        }
        
        // 2. Ruta: Detalle de Producto (/p/ID_PRODUCTO)
        if (req.path.startsWith('/p/')) {
            // Extraemos el ID de la URL manual o usamos params si configuramos router separado
            // Aquí lo haremos manual para no complicar la estructura actual
            return siteController.renderStoreProduct(req, res);
        }

        // 3. Ruta: Búsqueda y Categorías (/search)
        if (req.path === '/search') {
            return siteController.renderStoreSearch(req, res);
        }

        // Si no coincide con nada, 404 de la tienda
        return res.status(404).send('Página no encontrada en esta tienda');
    }
    
    // Si es el dominio principal (lfaftech.com), seguimos
    next();
});

// --- RUTAS DEL DOMINIO PRINCIPAL (lfaftech.com) ---

// Landing Page
router.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('landing', { title: 'Bienvenido a LFAFTECH' });
});

// Rutas de Auth y Dashboard
router.use('/', authRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;