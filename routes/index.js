// ==========================================================================
// RUTAS PÚBLICAS: ENRUTADOR INTELIGENTE API (Marketplace Global + Tiendas)
// ==========================================================================
const express = require('express');
const router = express.Router();
const siteController = require('../controllers/siteController');
const Product = require('../models/Product');

// ==========================================================================
// NUEVO: ENDPOINT PÚBLICO PARA FRONTEND ESTÁTICO (MÓVILES Y SUBDOMINIOS)
// ==========================================================================
// Permite que las plantillas y el index principal consulten los datos de cualquier tienda de forma directa
router.get('/store/public/:subdomain', siteController.renderStoreHome);

// ==========================================================================
// 1. RUTA PRINCIPAL (MARKETPLACE WUEPY O INICIO DE TIENDA)
// ==========================================================================
router.get('/', async (req, res) => {
    // A) SI ES UN SUBDOMINIO (Ej: tutienda.wuepy.com) -> Delegar al Controlador API
    if (!req.isMainDomain && req.subdomainName) {
        return siteController.renderStoreHome(req, res);
    }

    // B) LÓGICA DEL MARKETPLACE GLOBAL ("El AliExpress")
    try {
        // Buscar los productos más populares de toda la red Wuepy
        const globalProducts = await Product.find({ 
            showInGlobalMarketplace: true, 
            isActive: true 
        })
        .populate('site', 'name subdomain logoUrl') // Traer los datos del proveedor o tienda
        .sort({ views: -1, createdAt: -1 }) // Priorizar lo más visto y lo más nuevo
        .limit(40)
        .lean();

        // Enviar JSON puro al frontend en Cloudflare para que renderice la Landing global
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
    // A) SI ES UN SUBDOMINIO -> Busca solo dentro del inventario de ese emprendedor
    if (!req.isMainDomain && req.subdomainName) {
        return siteController.renderStoreSearch(req, res);
    }

    // B) LÓGICA DEL BUSCADOR GLOBAL (wuepy.com/search)
    try {
        const query = req.query.q || '';
        let filter = { showInGlobalMarketplace: true, isActive: true };
        
        // CORRECCIÓN CRÍTICA DE MONGOOSE:
        // Solo ordenamos por "textScore" si el usuario realmente ingresó texto en la búsqueda.
        // Si la query viene vacía, ordenamos por fecha de creación para evitar el colapso del servidor.
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
router.get('/p/:id', async (req, res) => {
    // A) SI ES UN SUBDOMINIO -> Muestra el producto usando el controlador API
    if (!req.isMainDomain && req.subdomainName) {
        return siteController.renderStoreProduct(req, res);
    }
    
    // B) LÓGICA GLOBAL: Si hacen clic en un producto desde el marketplace global
    // Al ser una API separada, le devolvemos al frontend la instrucción exacta de a dónde redirigir al cliente.
    try {
        const product = await Product.findById(req.params.id).populate('site');
        
        if (!product || !product.site || !product.site.isActive) {
            return res.status(404).json({ 
                success: false, 
                message: 'Este producto ya no está disponible o la tienda fue desactivada.' 
            });
        }

        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const frontendDomain = process.env.FRONTEND_DOMAIN || 'wuepy.com'; // Dominio principal del Frontend
        
        // Construimos la URL de redirección limpia apuntando al subdominio del vendedor
        const redirectUrl = `${protocol}://${product.site.subdomain}.${frontendDomain}/p/${product._id}`;

        return res.status(200).json({ 
            success: true, 
            redirectUrl: redirectUrl,
            message: 'Redirigiendo a la tienda oficial...'
        });

    } catch (error) {
        console.error('[Wuepy Core API] Error en redirección de producto:', error);
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'El identificador del producto no es válido.' });
        }
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al procesar el producto.' 
        });
    }
});

module.exports = router;