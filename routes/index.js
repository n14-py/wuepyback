// ==========================================================================
// RUTAS PÚBLICAS: ENRUTADOR INTELIGENTE API (Marketplace Global + Tiendas)
// ARQUITECTURA BLUEPRINT: CAPTURA Y ENRUTAMIENTO MULTIPÁGINA DINÁMICO IA
// ==========================================================================
const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const Product = require('../models/Product');

// Permite que las plantillas y el index principal consulten los datos de cualquier tienda de forma directa
router.get('/store/public/:subdomain', siteController.renderStoreHome);

// ==========================================================================
// 1. RUTA PRINCIPAL (MARKETPLACE WUEPY O INICIO DE TIENDA)
// ==========================================================================
router.get('/', async (req, res) => {
    // A) SI ES UN SUBDOMINIO (Ej: tutienda.wuepy.com)
    if (!req.isMainDomain && req.subdomainName) {
        return siteController.renderStoreHome(req, res);
    }

    // B) LÓGICA DEL MARKETPLACE GLOBAL
    try {
        // CORRECCIÓN: Filtro tolerante
        const globalProducts = await Product.find({ 
            showInGlobalMarketplace: true, 
            isActive: { $ne: false } 
        })
        .populate('site', 'name subdomain logoUrl') 
        .sort({ views: -1, createdAt: -1 }) 
        .limit(40)
        .lean();

        return res.status(200).json({ 
            success: true, 
            isMarketplace: true,
            title: 'Wuepy - El gran mercado',
            products: globalProducts 
        });

    } catch (error) {
        console.error('[Wuepy Core API] Error cargando el Marketplace Global:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Estamos actualizando la vitrina de Wuepy. Vuelve pronto.' 
        });
    }
});

// ==========================================================================
// 2. BUSCADOR (BÚSQUEDA GLOBAL O DENTRO DE UNA TIENDA)
// ==========================================================================
router.get('/search', async (req, res) => {
    // A) SI ES UN SUBDOMINIO
    if (!req.isMainDomain && req.subdomainName) {
        return siteController.renderStoreSearch(req, res);
    }

    // B) LÓGICA DEL BUSCADOR GLOBAL (wuepy.com/search)
    try {
        const query = req.query.q || '';
        // CORRECCIÓN: Filtro tolerante
        let filter = { showInGlobalMarketplace: true, isActive: { $ne: false } };
        
        let sortOption = { createdAt: -1 };

        if (query.trim() !== '') {
            filter.$text = { $search: query };
            sortOption = { score: { $meta: "textScore" } };
        }

        const searchResults = await Product.find(filter)
            .populate('site', 'name subdomain logoUrl')
            .sort(sortOption) 
            .limit(50)
            .lean();

        return res.status(200).json({ 
            success: true, 
            isMarketplaceSearch: true,
            searchQuery: query,
            products: searchResults 
        });

    } catch (error) {
        console.error('[Wuepy Core API] Error en buscador global:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error conectando con los proveedores del mercado.' 
        });
    }
});

// ==========================================================================
// 3. DETALLE DE PRODUCTO Y REDIRECCIÓN GLOBAL (/p/:id)
// ==========================================================================
// 3. DETALLE DE PRODUCTO (Ahora apunta directo al controlador sin redirección extra)
router.get('/p/:id', async (req, res) => {
    if (!req.isMainDomain && req.subdomainName) {
        return siteController.renderStoreProduct(req, res);
    }
    
    // Si no es subdominio, lógica de marketplace global
    try {
        const product = await Product.findById(req.params.id).populate('site');
        if (!product || !product.site || !product.site.isActive) {
            return res.status(404).json({ success: false, message: 'No disponible' });
        }
        // Redirección solo si es necesario para el marketplace
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const frontendDomain = process.env.FRONTEND_DOMAIN || 'wuepy.com'; 
        return res.json({ success: true, redirectUrl: `${protocol}://${product.site.subdomain}.${frontendDomain}/p/${product._id}` });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error' });
    }
});

// ==========================================================================
// 4. CAPTURADOR COMODÍN MULTIPÁGINA PARA SUBDOMINIOS IA (Ej: /nosotros.html)
// ==========================================================================
router.get('/:pageName', async (req, res, next) => {
    // Si la petición no ocurre en el dominio principal y tiene un subdominio activo
    if (!req.isMainDomain && req.subdomainName) {
        console.log(`[Rutas Wuepy] 🧭 Detectada navegación interna en subdominio para la página: ${req.params.pageName}`);
        // Mapeamos el parámetro de la URL hacia el query string para el controlador
        req.query.page = req.params.pageName;
        return siteController.renderStoreHome(req, res);
    }
    // Si es el dominio principal, dejamos que continúe el flujo normal o el manejador de errores 404
    next();
});

module.exports = router;