const Inventory = require('../models/Inventory');
const Site = require('../models/Site');

module.exports = {
    // 1. LISTAR
    getInventory: async (req, res) => {
        try {
            const siteId = req.params.siteId;
            const site = await Site.findOne({ _id: siteId, owner: req.user._id });
            
            if (!site) {
                req.flash('error_msg', 'Sitio no encontrado.');
                return res.redirect('/dashboard');
            }

            const products = await Inventory.find({ site: siteId }).sort({ createdAt: -1 });

            res.render('dashboard/inventory/list', {
                title: `Inventario - ${site.name}`,
                site,
                products
            });
        } catch (error) {
            console.error(error);
            res.redirect('/dashboard');
        }
    },

    // 2. FORMULARIO
    getForm: async (req, res) => {
        try {
            const { siteId, productId } = req.params;
            const site = await Site.findOne({ _id: siteId, owner: req.user._id });
            
            if (!site) return res.redirect('/dashboard');

            let product = null;
            if (productId) {
                product = await Inventory.findOne({ _id: productId, site: siteId });
            }

            res.render('dashboard/inventory/form', {
                title: product ? 'Editar Producto' : 'Nuevo Producto',
                site,
                product
            });
        } catch (error) {
            console.error(error);
            res.redirect(`/dashboard/inventory/${req.params.siteId}`);
        }
    },

    // 3. GUARDAR (CREATE/UPDATE)
    saveProduct: async (req, res) => {
        const { siteId, productId } = req.params;

        try {
            // DEBUG: Ver en consola qué llega
            console.log('--- SAVE PRODUCT ---');
            console.log('Body:', req.body);
            console.log('File:', req.file ? 'SI (Recibido)' : 'NO (Vacio)');

            const { name, price, stock, description, category } = req.body;

            const site = await Site.findOne({ _id: siteId, owner: req.user._id });
            if (!site) {
                req.flash('error_msg', 'Permiso denegado');
                return res.redirect('/dashboard');
            }

            const productData = {
                name,
                price,
                stock,
                description,
                category,
                site: siteId,
                owner: req.user._id
            };

            // Lógica de Imagen
            if (req.file) {
                // Si subió archivo nuevo, usamos la URL segura que nos dio BunnyStorage
                productData.images = [req.file.path]; 
                productData.imageUrl = req.file.path;
            } else if (!productId) {
                // Si es nuevo y NO subió nada, ponemos placeholder
                productData.imageUrl = 'https://placehold.co/400?text=Sin+Imagen';
                productData.images = [productData.imageUrl];
            }
            // Si es edición y no subió nada, no tocamos la imagen (se mantiene la anterior)

            if (productId) {
                await Inventory.findOneAndUpdate({ _id: productId }, productData);
                req.flash('success_msg', 'Producto actualizado.');
            } else {
                const newProduct = new Inventory(productData);
                await newProduct.save();
                req.flash('success_msg', 'Producto creado.');
            }

            res.redirect(`/dashboard/inventory/${siteId}`);

        } catch (error) {
            console.error('ERROR GUARDANDO:', error);
            req.flash('error_msg', 'Error al guardar: ' + error.message);
            res.redirect(`/dashboard/inventory/${siteId}`);
        }
    },

    // 4. ELIMINAR
    deleteProduct: async (req, res) => {
        try {
            const { siteId, productId } = req.params;
            await Inventory.findOneAndDelete({ _id: productId, owner: req.user._id });
            req.flash('success_msg', 'Producto eliminado');
            res.redirect(`/dashboard/inventory/${siteId}`);
        } catch (error) {
            console.error(error);
            res.redirect('/dashboard');
        }
    }
};