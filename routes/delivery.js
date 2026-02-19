// UBICACIÓN: lfaftech.com/routes/delivery.js

const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { ensureAuthenticated } = require('../middleware/auth');

// 🔒 SEGURIDAD: Todas las rutas de logística requieren login
router.use(ensureAuthenticated);

// --- 1. RUTA DE VISTA (IMPORTANTE) ---
// Esta es la que carga el archivo HTML visual cuando haces clic en el menú.
// URL: /api/delivery/panel
router.get('/panel', (req, res) => {
    try {
        // Renderiza el archivo que está en views/dashboard/delivery.html
        res.render('dashboard/delivery.html', { 
            user: req.user,
            pageTitle: 'Gestión de Delivery'
        });
    } catch (error) {
        console.error("Error cargando vista de delivery:", error);
        res.status(500).send('Error cargando el panel de logística.');
    }
});

// --- 2. RUTAS DE API (DATOS JSON) ---

// GET /api/delivery/ -> Obtiene la lista de repartidores (para llenar la tabla)
router.get('/', deliveryController.getMyDeliveries);

// POST /api/delivery/create -> Crea un nuevo chofer en la base de datos
router.post('/create', deliveryController.createDelivery);

// POST /api/delivery/assign -> Asigna un pedido, calcula costos y envía WhatsApps
// Esta es la función maestra que conecta KingsStore con LFAF
router.post('/assign', deliveryController.assignOrderToDelivery);

// POST /api/delivery/update-status -> Para cambiar estado manualmente (ej: Entregado)
router.post('/update-status', deliveryController.updateDeliveryStatus);

module.exports = router;