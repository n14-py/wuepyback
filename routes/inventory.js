const express = require('express');
const router = express.Router({ mergeParams: true }); // Para asegurar acceso a params
const multer = require('multer');
const BunnyStorage = require('../utils/bunnyStorage');
const { ensureAuthenticated } = require('../middleware/auth');
const inventoryController = require('../controllers/inventoryController');

// Configuración Storage
const storage = new BunnyStorage({
    storageZone: process.env.BUNNY_STORAGE_NAME,
    accessKey: process.env.BUNNY_API_KEY,
    pullZone: process.env.BUNNY_PULL_ZONE_URL
});
const upload = multer({ storage: storage });

// Middleware para forzar la carpeta 'products'
const useProductFolder = (req, res, next) => {
    req.bunnyFolder = 'products';
    next();
};

router.use(ensureAuthenticated);

// 1. Listar
router.get('/:siteId', inventoryController.getInventory);

// 2. Crear
router.get('/:siteId/new', inventoryController.getForm);
router.post('/:siteId/new', 
    useProductFolder,        // 1. Definimos carpeta
    upload.single('image'),  // 2. Procesamos archivo
    inventoryController.saveProduct // 3. Guardamos en BD
);

// 3. Editar
router.get('/:siteId/edit/:productId', inventoryController.getForm);
router.post('/:siteId/edit/:productId', 
    useProductFolder,
    upload.single('image'), 
    inventoryController.saveProduct
);

// 4. Eliminar
router.post('/:siteId/delete/:productId', inventoryController.deleteProduct);

module.exports = router;