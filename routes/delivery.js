// ==========================================================================
// WUEPY.COM - RUTAS DE LOGÍSTICA / DELIVERY (API REST)
// ==========================================================================
const express = require('express');
const router = express.Router({ mergeParams: true });
const deliveryController = require('../controllers/deliveryController');
const { ensureSiteAccess } = require('../middleware/auth');

// 🔒 SEGURIDAD: Solo usuarios de la tienda (Dueño o empleados)
router.use(ensureSiteAccess);

// --- ENDPOINTS DE API ---

// GET: Obtiene la lista de repartidores de la tienda actual
router.get('/', deliveryController.getMyDeliveries);

// POST: Crea un nuevo chofer en la base de datos
router.post('/create', deliveryController.createDelivery);

// POST: Asigna un pedido, calcula costos y genera plantilla de WhatsApp
router.post('/assign', deliveryController.assignOrderToDelivery);

// POST: Cambiar estado manualmente (ej: in_transit -> completed)
router.post('/update-status', deliveryController.updateDeliveryStatus);

module.exports = router;