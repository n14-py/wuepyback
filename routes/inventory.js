// ==========================================================================
// WUEPY.COM - RUTAS DE INVENTARIO (API REST)
// ==========================================================================
const express = require('express');
const router = express.Router({ mergeParams: true });
const Site = require('../models/Site');
const Product = require('../models/Product');
const inventoryController = require('../controllers/inventoryController');
const { ensureSiteAccess } = require('../middleware/auth');

// CORRECCIÓN: Inyectamos multer para procesar las imágenes y "desempaquetar" el req.body
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// ==========================================
// MIDDLEWARE: VERIFICAR LÍMITES DE PLANES (API)
// ==========================================
const checkPlanLimits = async (req, res, next) => {
    try {
        const siteId = req.params.siteId || req.body.siteId || req.query.siteId || req.user.siteId;
        const site = await Site.findById(siteId);
        
        if (!site) {
            return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });
        }

        const productCount = await Product.countDocuments({ site: site._id });

        let limit = 0;
        if (site.plan === 'basico') limit = 30;
        if (site.plan === 'medio') limit = 80;
        if (site.plan === 'profesional') limit = Infinity;

        if (productCount >= limit && limit !== Infinity) {
            return res.status(403).json({ 
                success: false, 
                message: `Tu plan ${site.plan.toUpperCase()} permite hasta ${limit} productos. Actualiza tu plan para agregar más.`,
                errorCode: 'PLAN_LIMIT_REACHED'
            });
        }

        req.site = site; 
        next();
    } catch (error) {
        console.error('Error al verificar límites:', error);
        return res.status(500).json({ success: false, message: 'Error interno verificando plan.' });
    }
};

// --- ENDPOINTS ---

// 1. Obtener catálogo completo
router.get('/', ensureSiteAccess, inventoryController.getInventory);

// 2. Obtener un solo producto (Para llenar el formulario de edición en Flutter/React)
router.get('/:productId', ensureSiteAccess, inventoryController.getProduct);

// 3. Crear nuevo producto 
// CORRECCIÓN: upload.single va PRIMERO para que 'ensureSiteAccess' pueda leer el siteId del req.body
router.post('/add', upload.single('image'), ensureSiteAccess, checkPlanLimits, inventoryController.saveProduct);

// 4. Actualizar producto existente
router.post('/edit/:productId', upload.single('image'), ensureSiteAccess, inventoryController.saveProduct);

// 5. Eliminar producto
router.post('/delete/:productId', ensureSiteAccess, inventoryController.deleteProduct);

module.exports = router;