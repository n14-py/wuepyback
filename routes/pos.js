// UBICACIÓN: lfaftech.com/routes/pos.js

const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const posController = require('../controllers/posController');

// --- VISTAS PRINCIPALES ---

// 1. Terminal de Venta (La pantalla principal del POS)
// URL: /dashboard/pos/terminal
router.get('/terminal', ensureAuthenticated, posController.renderPosScreen);

// 2. Gestión de Inventario Independiente
// URL: /dashboard/pos/inventory
router.get('/inventory', ensureAuthenticated, posController.getInventory);

// 3. Historial de Ventas
// URL: /dashboard/pos/history
router.get('/history', ensureAuthenticated, posController.getSalesHistory);


// --- PROCESOS Y FORMULARIOS ---

// Guardar un nuevo producto (Desde el formulario de inventario)
router.post('/inventory/add', ensureAuthenticated, posController.saveProduct);


// --- API ENDPOINTS (Para la interactividad sin recargar) ---

// Escanear código de barras (El celular llama aquí)
// Uso: /dashboard/pos/api/scan?code=123456
router.get('/api/scan', ensureAuthenticated, posController.scanBarcode);

// Procesar la venta final (Cobrar)
router.post('/api/process-sale', ensureAuthenticated, posController.processSale);

module.exports = router;