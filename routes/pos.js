// ==========================================================================
// WUEPY.COM - RUTAS DEL PUNTO DE VENTA (API REST)
// ==========================================================================

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams permite heredar el siteId si viene desde el dashboard
const { ensureAuthenticated, ensureSiteAccess } = require('../middleware/auth');
const posController = require('../controllers/posController');

// --- ENDPOINTS DE DATOS (Sustituyen a las antiguas Vistas) ---

// 1. Obtener los datos iniciales para cargar la Terminal de Venta (Productos, Deliverys, etc.)
// URL API: GET /api/dashboard/site/:siteId/pos/terminal
router.get('/terminal', ensureSiteAccess, posController.renderPosScreen);

// 2. Historial de Ventas (Para la tabla del frontend)
// URL API: GET /api/dashboard/site/:siteId/pos/history
router.get('/history', ensureSiteAccess, posController.getSalesHistory);

// --- ENDPOINTS DE OPERACIONES (El núcleo interactivo) ---

// 3. Escanear código de barras (El frontend o la app Flutter llama aquí)
// URL API: GET /api/dashboard/site/:siteId/pos/api/scan?code=123456
router.get('/api/scan', ensureSiteAccess, posController.scanBarcode);

// 4. Procesar la venta final (Cobrar, descontar stock y despachar)
// URL API: POST /api/dashboard/site/:siteId/pos/api/process-sale
router.post('/api/process-sale', ensureSiteAccess, posController.processSale);

// (Opcional) Si en el futuro separas el inventario aquí, puedes habilitar esta ruta:
// router.get('/inventory', ensureSiteAccess, posController.getInventory);
// router.post('/inventory/add', ensureSiteAccess, posController.saveProduct);

module.exports = router;