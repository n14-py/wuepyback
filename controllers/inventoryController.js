// ==========================================================================
// WUEPY.COM - CONTROLADOR DE INVENTARIO (API REST)
// ==========================================================================
const Product = require('../models/Product');
const Site = require('../models/Site');

module.exports = {
    // ==========================================
    // 1. OBTENER TODO EL INVENTARIO
    // ==========================================
    getInventory: async (req, res) => {
        try {
            const siteId = req.params.siteId || req.user.siteId;
            const site = await Site.findOne({ _id: siteId });
            
            if (!site) {
                return res.status(404).json({ success: false, message: 'Sitio no encontrado o no tienes permisos.' });
            }

            const products = await Product.find({ site: siteId }).sort({ createdAt: -1 }).lean();
            let maxProducts = site.plan === 'basico' ? 30 : (site.plan === 'medio' ? 80 : 'Ilimitados');

            return res.status(200).json({
                success: true,
                title: `Inventario - ${site.name}`,
                site: { id: site._id, name: site.name, plan: site.plan },
                maxProducts,
                products
            });
        } catch (error) {
            console.error('Error listando inventario:', error);
            return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    },

    // ==========================================
    // 2. OBTENER UN SOLO PRODUCTO (Para editar)
    // ==========================================
    getProduct: async (req, res) => {
        try {
            const { siteId, productId } = req.params;
            const product = await Product.findOne({ _id: productId, site: siteId }).lean();

            if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado.' });

            return res.status(200).json({ success: true, product });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error interno obteniendo el producto.' });
        }
    },

    // ==========================================
    // 3. GUARDAR (CREAR O ACTUALIZAR)
    // ==========================================
    saveProduct: async (req, res) => {
        const siteId = req.params.siteId || req.user.siteId;
        const productId = req.params.productId;

        try {
            const { 
                name, price, priceUSD, stock, description, shortDescription, 
                category, globalCategory, showInGlobalMarketplace, sku, lowStockThreshold 
            } = req.body;

            const isGlobal = showInGlobalMarketplace === 'on' || showInGlobalMarketplace === true || showInGlobalMarketplace === 'true';

            const productData = {
                name,
                price: parseFloat(price) || 0,
                priceUSD: parseFloat(priceUSD) || 0,
                stock: parseInt(stock) || 0,
                lowStockThreshold: parseInt(lowStockThreshold) || 5,
                description,
                shortDescription: shortDescription || '',
                category: category || 'General',
                globalCategory: globalCategory || 'Otros',
                showInGlobalMarketplace: isGlobal,
                sku: sku || '',
                site: siteId,
                lastModifiedBy: req.user.role || 'owner'
            };

            if (req.file) {
                productData.imageUrl = req.file.path;
            } else if (!productId) {
                productData.imageUrl = 'https://placehold.co/400?text=Sin+Imagen';
            }

            if (productId) {
                // EDITAR PRODUCTO EXISTENTE
                const updatedProduct = await Product.findOneAndUpdate({ _id: productId, site: siteId }, productData, { new: true });
                return res.status(200).json({ success: true, message: 'Producto actualizado correctamente.', product: updatedProduct });
            } else {
                // CREAR NUEVO PRODUCTO
                productData.createdBy = req.user.role || 'owner';
                const newProduct = new Product(productData);
                await newProduct.save();
                return res.status(201).json({ success: true, message: '¡Producto añadido al inventario!', product: newProduct });
            }

        } catch (error) {
            console.error('ERROR GUARDANDO PRODUCTO:', error);
            return res.status(500).json({ success: false, message: 'Error al guardar el producto: ' + error.message });
        }
    },

    // ==========================================
    // 4. ELIMINAR
    // ==========================================
    deleteProduct: async (req, res) => {
        try {
            const { siteId, productId } = req.params;
            await Product.findOneAndDelete({ _id: productId, site: siteId });
            return res.status(200).json({ success: true, message: 'Producto eliminado del catálogo.' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error al eliminar el producto.' });
        }
    }
};