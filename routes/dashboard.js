const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const BunnyStorage = require('../utils/bunnyStorage');
const { ensureAuthenticated } = require('../middleware/auth');
const siteController = require('../controllers/siteController');
const Site = require('../models/Site'); 

// 1. IMPORTAR RUTAS PERDIDAS
const inventoryRoutes = require('./inventory'); 
const posRoutes = require('./pos'); // <--- RECUPERANDO EL POS

const storage = new BunnyStorage({
    storageZone: process.env.BUNNY_STORAGE_NAME,
    accessKey: process.env.BUNNY_API_KEY,
    pullZone: process.env.BUNNY_PULL_ZONE_URL
});
const upload = multer({ storage: storage });

// 2. CONECTAR RUTAS
router.use('/inventory', inventoryRoutes); 
router.use('/pos', posRoutes); // <--- CONECTANDO EL POS (AQUÍ ESTABA EL ERROR)

// ==========================================
// RUTAS DEL DASHBOARD PRINCIPAL
// ==========================================

// Home del Dashboard
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const sites = await Site.find({ owner: req.user._id });
        res.render('dashboard/index', { user: req.user, sites, title: 'Mi Panel' });
    } catch (error) {
        // Fallback por si falla el render
        res.sendFile(path.join(__dirname, '../views/dashboard/index.html'));
    }
});

router.get('/solutions', ensureAuthenticated, (req, res) => {
    res.render('dashboard/solutions', { user: req.user, title: 'Catálogo' });
});

// Rutas de Sitios
router.get('/create-site', ensureAuthenticated, siteController.getBuilder);
router.post('/site/create', ensureAuthenticated, upload.single('logo'), siteController.createSite);
router.get('/site/:siteId', ensureAuthenticated, siteController.getSiteOverview);
router.get('/site/:siteId/settings', ensureAuthenticated, siteController.getSettings);
router.post('/site/:siteId/settings', ensureAuthenticated, upload.single('logo'), siteController.updateSite);

// ==========================================
// RUTAS DEL AGENTE IA (NUEVAS)
// ==========================================
router.get('/agents', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../views/dashboard/agents/index.html')));
router.get('/agents/config', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../views/dashboard/agents/config.html')));
router.get('/agents/products', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../views/dashboard/agents/products.html')));
router.get('/agents/orders', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../views/dashboard/agents/orders.html')));
router.get('/agents/deliveries', ensureAuthenticated, (req, res) => res.sendFile(path.join(__dirname, '../views/dashboard/agents/deliveries.html')));

module.exports = router;