const Site = require('../models/Site');
const Inventory = require('../models/Inventory');

module.exports = {
    // ==========================================
    // ÁREA PRIVADA (DASHBOARD - BACKEND)
    // ==========================================

    getBuilder: (req, res) => {
        res.render('dashboard/create-site', {
            user: req.user,
            title: 'Crear Tienda Profesional'
        });
    },

    createSite: async (req, res) => {
        try {
            const { 
                name, subdomain, template, 
                primaryColor, secondaryColor, 
                heroTitle, heroSubtitle, aboutText,
                whatsapp, phone, contactEmail, address, schedule,
                facebook, instagram, tiktok 
            } = req.body;
            
            const existingSite = await Site.findOne({ subdomain: subdomain.toLowerCase() });
            if (existingSite) {
                req.flash('error_msg', '¡El subdominio ya existe! Elige otro.');
                return res.redirect('/dashboard/create-site');
            }

            // Limpieza de WhatsApp para API (Solo números)
            const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, '');

            const newSite = new Site({
                owner: req.user._id,
                name,
                subdomain: subdomain.toLowerCase(),
                template,
                primaryColor,
                secondaryColor,
                content: {
                    heroTitle,
                    heroSubtitle,
                    aboutText,
                    footerText: `© ${new Date().getFullYear()} ${name}`
                },
                contact: {
                    whatsapp: cleanWhatsapp,
                    phone: phone || whatsapp,
                    email: contactEmail || req.user.email,
                    address,
                    schedule
                },
                social: { facebook, instagram, tiktok }
            });

            if (req.file) newSite.logoUrl = req.file.path; 

            await newSite.save();
            req.flash('success_msg', '¡Tienda creada exitosamente!');
            res.redirect('/dashboard');

        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Error al crear la tienda.');
            res.redirect('/dashboard/create-site');
        }
    },

    getSiteOverview: async (req, res) => {
        try {
            const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id });
            if (!site) return res.redirect('/dashboard');

            const productCount = await Inventory.countDocuments({ site: site._id });
            const totalStock = await Inventory.aggregate([
                { $match: { site: site._id } },
                { $group: { _id: null, total: { $sum: "$stock" } } }
            ]);

            res.render('dashboard/site-overview', {
                user: req.user,
                site,
                stats: {
                    products: productCount,
                    stock: totalStock[0] ? totalStock[0].total : 0,
                    views: site.views || 0
                },
                title: `Gestionar ${site.name}`
            });
        } catch (error) {
            console.error(error);
            res.redirect('/dashboard');
        }
    },


    // ... (después de getSiteOverview)

    // 1. MOSTRAR FORMULARIO DE EDICIÓN
    getSettings: async (req, res) => {
        try {
            const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id });
            if (!site) return res.redirect('/dashboard');

            res.render('dashboard/site-settings', {
                user: req.user,
                site: site,
                title: `Configuración - ${site.name}`
            });
        } catch (error) {
            console.error(error);
            res.redirect('/dashboard');
        }
    },

    // 2. PROCESAR LA ACTUALIZACIÓN
    updateSite: async (req, res) => {
        try {
            const siteId = req.params.siteId;
            const { 
                name, template, 
                primaryColor, secondaryColor, 
                heroTitle, heroSubtitle, aboutText,
                whatsapp, phone, contactEmail, address, schedule,
                facebook, instagram, tiktok 
            } = req.body;

            // Verificar propiedad
            const site = await Site.findOne({ _id: siteId, owner: req.user._id });
            if (!site) {
                req.flash('error_msg', 'No tienes permiso para editar este sitio.');
                return res.redirect('/dashboard');
            }

            // Limpiar WhatsApp
            const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, '');

            // Actualizar campos
            site.name = name;
            site.template = template;
            site.primaryColor = primaryColor;
            site.secondaryColor = secondaryColor;
            
            site.content = {
                heroTitle,
                heroSubtitle,
                aboutText,
                footerText: `© ${new Date().getFullYear()} ${name}`
            };

            site.contact = {
                whatsapp: cleanWhatsapp,
                phone: phone || whatsapp,
                email: contactEmail,
                address,
                schedule
            };

            site.social = { facebook, instagram, tiktok };

            // Si subió un nuevo logo, actualizamos
            if (req.file) {
                site.logoUrl = req.file.path;
            }

            await site.save();

            req.flash('success_msg', '¡Cambios guardados correctamente!');
            res.redirect(`/dashboard/site/${siteId}/settings`);

        } catch (error) {
            console.error(error);
            req.flash('error_msg', 'Error al actualizar el sitio.');
            res.redirect(`/dashboard/site/${req.params.siteId}/settings`);
        }
    },

    // ... (antes de renderGeneratedSite)

    // ==========================================
    // ÁREA PÚBLICA (LA TIENDA ONLINE VISIBLE)
    // ==========================================

    // 1. PÁGINA DE INICIO (HOME)
    renderStoreHome: async (req, res) => {
        try {
            const subdomain = req.subdomainName;
            const site = await Site.findOne({ subdomain });
            
            if (!site) return res.status(404).render('errors/404-site', { domain: subdomain });
            if (!site.isActive) return res.status(403).render('errors/suspended', { siteName: site.name });

            // Registrar visita (simple)
            await Site.updateOne({ _id: site._id }, { $inc: { views: 1 } });

            // Productos destacados (los más nuevos)
            const products = await Inventory.find({ site: site._id, status: 'disponible' })
                                            .sort({ createdAt: -1 })
                                            .limit(8); // Límite de 8 en home

            // Categorías para el menú
            const categories = await Inventory.distinct('category', { site: site._id });

            res.render(`templates/${site.template}/index`, {
                site,
                products,
                categories,
                title: site.name
            });

        } catch (error) {
            console.error('Error Home:', error);
            res.status(500).send('Error interno');
        }
    },

    // 2. DETALLE DE PRODUCTO
    renderStoreProduct: async (req, res) => {
        try {
            const subdomain = req.subdomainName;
            const productId = req.path.split('/')[2]; // Extraer ID de la URL

            const site = await Site.findOne({ subdomain });
            if (!site) return res.status(404).send('Tienda no encontrada');

            const product = await Inventory.findOne({ _id: productId, site: site._id });
            if (!product) return res.status(404).send('Producto no encontrado');

            // Productos Relacionados (Misma categoría, excluyendo el actual)
            const related = await Inventory.find({ 
                site: site._id, 
                category: product.category, 
                _id: { $ne: product._id }, // No incluir el mismo producto
                status: 'disponible'
            }).limit(4);

            res.render(`templates/${site.template}/product`, {
                site,
                product,
                related,
                title: `${product.name} - ${site.name}`
            });

        } catch (error) {
            console.error('Error Producto:', error);
            res.status(404).send('Producto no encontrado');
        }
    },

    // 3. BUSCADOR Y PÁGINA DE CATEGORÍAS
    renderStoreSearch: async (req, res) => {
        try {
            const subdomain = req.subdomainName;
            const query = req.query.q || ''; // Texto buscado
            const category = req.query.category || ''; // Filtro categoría

            const site = await Site.findOne({ subdomain });
            if (!site) return res.status(404).send('Tienda no encontrada');

            // Construir filtro de base de datos
            let filter = { site: site._id, status: 'disponible' };
            
            if (query) {
                // Búsqueda flexible (insensible a mayúsculas) en nombre o descripción
                filter.$or = [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { category: { $regex: query, $options: 'i' } }
                ];
            }
            
            if (category) {
                filter.category = category;
            }

            const products = await Inventory.find(filter).sort({ createdAt: -1 });
            const categories = await Inventory.distinct('category', { site: site._id });

            res.render(`templates/${site.template}/search`, {
                site,
                products,
                categories,
                searchQuery: query,
                currentCategory: category,
                title: `Resultados para "${query || category || 'Todo'}"`
            });

        } catch (error) {
            console.error('Error Búsqueda:', error);
            res.status(500).send('Error buscando productos');
        }
    }
};