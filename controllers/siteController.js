// ==========================================================================
// WUEPY.COM - CONTROLADOR CENTRAL DEL SITIO (VERSIÓN API REST)
// ==========================================================================
const path = require('path');
const Site = require('../models/Site');
const Product = require('../models/Product'); 
const agentAiService = require('../services/agentAiService'); 

module.exports = {
    // ==========================================
    // ÁREA PRIVADA (DASHBOARD - BACKEND API)
    // ==========================================

    getBuilder: (req, res) => {
        // En la API, solo confirmamos que tiene permiso. El Frontend/App se encarga de mostrar la UI.
        return res.status(200).json({ 
            success: true, 
            user: req.user, 
            message: 'Acceso autorizado al creador de tiendas.' 
        });
    },

    createSite: async (req, res) => {
        try {
            const { 
                businessType, name, subdomain, designMode, aiPrompt, template, 
                primaryColor, secondaryColor, plan, 
                heroTitle, aboutText,
                whatsapp, contactEmail, address
            } = req.body;
            
            // Limpieza estricta de subdominio (Antihack, anti-espacios y en minúsculas)
            const cleanSubdomain = subdomain.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');

            const existingSite = await Site.findOne({ subdomain: cleanSubdomain });
            if (existingSite) {
                return res.status(400).json({ 
                    success: false, 
                    message: '¡El enlace de la tienda (subdominio) ya está en uso! Por favor elige otro.' 
                });
            }

            // Limpieza de WhatsApp (Solo números)
            const cleanWhatsapp = whatsapp ? whatsapp.replace(/[^0-9]/g, '') : '';

            // LÓGICA DE SUSCRIPCIÓN FREEMIUM (1 Mes Gratis Garantizado)
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30);

            const newSite = new Site({
                owner: req.user._id,
                name,
                subdomain: cleanSubdomain,
                businessType: businessType || 'otro', 
                plan: plan || 'basico',
                subscriptionStatus: 'trial', 
                trialEndsAt: trialEndDate,   
                
                wuepyApoya: { status: 'none', freeMonthsGranted: 0 },
                wuepyInvierte: { status: 'none', requestedAmount: 0 },

                designMode: designMode || 'template',
                aiPrompt: aiPrompt || '',
                template: template || 'template1',
                primaryColor: primaryColor || '#3b82f6',
                secondaryColor: secondaryColor || '#1e293b',
                
                content: {
                    heroTitle,
                    heroSubtitle: '', 
                    aboutText
                },
                contact: {
                    whatsapp: cleanWhatsapp,
                    phone: cleanWhatsapp,
                    email: contactEmail || req.user.email,
                    address,
                    schedule: ''
                },
                social: { facebook: '', instagram: '', tiktok: '' }
            });

            // Si subió un logo por multer (R2/BunnyCDN o Local)
            if (req.file) newSite.logoUrl = req.file.path; 

            await newSite.save();

            // ==========================================
            // MAGIA IA: DISPARAR EL ORQUESTADOR GEMINI
            // ==========================================
            if (newSite.designMode === 'ai_generated' && newSite.aiPrompt && newSite.plan !== 'basico') {
                const aiResult = await agentAiService.orquestarDisenoWeb(newSite._id, newSite.aiPrompt);
                if (!aiResult.success) {
                    console.error("Error orquestando IA:", aiResult.error);
                    return res.status(201).json({ 
                        success: true, 
                        siteId: newSite._id,
                        warning: 'Tu negocio fue creado, pero el motor de Inteligencia Artificial tuvo un problema. Contacta a soporte.' 
                    });
                }
            }

            // Generar la URL pública para enviarla al frontend
            const frontendDomain = process.env.FRONTEND_DOMAIN || 'wuepy.com';
            const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
            const storeUrl = `${protocol}://${newSite.subdomain}.${frontendDomain}`;

            return res.status(201).json({ 
                success: true, 
                siteId: newSite._id,
                storeUrl: storeUrl,
                message: '¡Felicidades! Tu plataforma fue creada con éxito. ¡Disfruta tu primer mes gratis!' 
            });

        } catch (error) {
            console.error("Error fatal creando sitio:", error);
            return res.status(500).json({ success: false, message: 'Error inesperado al procesar tu solicitud. Inténtalo de nuevo.' });
        }
    },

    getSiteOverview: async (req, res) => {
        try {
            const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id });
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

            const productCount = await Product.countDocuments({ site: site._id });
            const totalStock = await Product.aggregate([
                { $match: { site: site._id } },
                { $group: { _id: null, total: { $sum: "$stock" } } }
            ]);

            return res.status(200).json({
                success: true,
                user: req.user,
                site,
                stats: {
                    products: productCount,
                    stock: totalStock[0] ? totalStock[0].total : 0,
                    views: site.views || 0
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Error al cargar los datos de la tienda.' });
        }
    },

    getSettings: async (req, res) => {
        try {
            const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id });
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

            return res.status(200).json({ success: true, user: req.user, site });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Error al cargar configuraciones.' });
        }
    },

    updateSite: async (req, res) => {
        try {
            const siteId = req.params.siteId;
            const { 
                name, template, showInMarketplace,
                primaryColor, secondaryColor, 
                heroTitle, heroSubtitle, aboutText,
                whatsapp, phone, contactEmail, address, schedule,
                facebook, instagram, tiktok 
            } = req.body;

            const site = await Site.findOne({ _id: siteId, owner: req.user._id });
            if (!site) {
                return res.status(403).json({ success: false, message: 'Acceso denegado.' });
            }

            const cleanWhatsapp = whatsapp ? whatsapp.replace(/[^0-9]/g, '') : '';
            const isShowInMarketplace = showInMarketplace === 'on' || showInMarketplace === true || showInMarketplace === 'true';

            site.name = name;
            site.template = template;
            site.showInMarketplace = isShowInMarketplace; 
            site.primaryColor = primaryColor;
            site.secondaryColor = secondaryColor;
            
            site.content = { heroTitle, heroSubtitle, aboutText };
            site.contact = {
                whatsapp: cleanWhatsapp,
                phone: phone || whatsapp,
                email: contactEmail,
                address,
                schedule
            };
            site.social = { facebook, instagram, tiktok };

            if (req.file) site.logoUrl = req.file.path; 

            await site.save();
            return res.status(200).json({ success: true, message: '¡Configuración guardada!', site });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Error al actualizar.' });
        }
    },

    enviarPostulacionApoya: async (req, res) => {
        try {
            const { siteId, videoUrl, story } = req.body;

            const site = await Site.findOne({ _id: siteId, owner: req.user._id });
            if (!site) {
                return res.status(403).json({ success: false, message: 'Tienda no encontrada o acceso denegado.' });
            }

            site.wuepyApoya = {
                status: 'pending',
                startupStory: story || '',
                videoEvidenceUrl: videoUrl,
                freeMonthsGranted: 0
            };

            await site.save();
            return res.status(200).json({ success: true, message: '¡Tu postulación a Wuepy Apoya fue enviada con éxito! Revisaremos tu mención en las próximas horas.' });

        } catch (error) {
            console.error("Error al enviar postulación Wuepy Apoya:", error);
            return res.status(500).json({ success: false, message: 'Hubo un error inesperado al procesar tu postulación.' });
        }
    },

    // ==========================================
    // ÁREA PÚBLICA (ENRUTAMIENTO INTELIGENTE API PARA EL FRONTEND/APP)
    // ==========================================

    renderStoreHome: async (req, res) => {
        try {
            // Extraído por nuestro enrutador inteligente en server.js
            const subdomain = req.subdomainName || req.params.subdomain;
            const site = await Site.findOne({ subdomain });
            
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada', errorCode: 'NOT_FOUND' });
            
            // Lógica de Prevención y Bloqueos
            if (!site.isActive || site.subscriptionStatus === 'suspended') {
                return res.status(403).json({ success: false, message: 'Tienda suspendida por falta de pago o inactividad', errorCode: 'SUSPENDED' });
            }

            // Registrar visita (Útil para métricas)
            await Site.updateOne({ _id: site._id }, { $inc: { views: 1 } });

            // ENRUTAMIENTO IA: Si fue generada por IA, el frontend buscará en la carpeta estática.
            if (site.designMode === 'ai_generated' && site.customHtmlFolder) {
                return res.status(200).json({
                    success: true,
                    isAiGenerated: true,
                    aiFolder: site.customHtmlFolder,
                    site,
                    message: 'Esta tienda es servida por IA estática'
                });
            }

            // ENRUTAMIENTO TRADICIONAL
            const products = await Product.find({ site: site._id, isActive: true })
                                          .sort({ createdAt: -1 })
                                          .limit(12).lean();

            const categories = await Product.distinct('category', { site: site._id, isActive: true });

            return res.status(200).json({
                success: true,
                isAiGenerated: false,
                site,
                products,
                categories
            });

        } catch (error) {
            console.error('Error Home Store API:', error);
            return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    },

    renderStoreProduct: async (req, res) => {
        try {
            const subdomain = req.subdomainName || req.params.subdomain;
            
            // CORRECCIÓN CRÍTICA: En routes/index.js tu parámetro es :id, no :productId
            // Por lo tanto extraemos req.params.id directamente
            const productId = req.params.id; 

            if (!productId) {
                 return res.status(400).json({ success: false, message: 'ID de producto no proporcionado' });
            }

            const site = await Site.findOne({ subdomain });
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

            const product = await Product.findOne({ _id: productId, site: site._id }).lean();
            if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

            // Actualizar vistas del producto para el "Social Proof" 
            await Product.updateOne({ _id: productId }, { $inc: { views: 1 } });

            const related = await Product.find({ 
                site: site._id, 
                category: product.category, 
                _id: { $ne: product._id }, 
                isActive: true
            }).limit(4).lean();

            return res.status(200).json({
                success: true,
                site,
                product,
                related
            });

        } catch (error) {
            console.error('Error Producto API:', error);
            // Capturar error si el ID no tiene formato válido de MongoDB (CastError)
            if (error.name === 'CastError') {
                return res.status(404).json({ success: false, message: 'Producto no encontrado o ID inválido' });
            }
            return res.status(500).json({ success: false, message: 'Error interno al cargar el producto' });
        }
    },

    renderStoreSearch: async (req, res) => {
        try {
            const subdomain = req.subdomainName || req.params.subdomain;
            const query = req.query.q || ''; 
            const category = req.query.category || ''; 

            const site = await Site.findOne({ subdomain });
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

            let filter = { site: site._id, isActive: true };
            
            // Aprovechamos los índices "text" para búsquedas rápidas
            if (query) {
                filter.$text = { $search: query };
            }
            
            if (category) filter.category = category;

            const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
            const categories = await Product.distinct('category', { site: site._id, isActive: true });

            return res.status(200).json({
                success: true,
                site,
                products,
                categories,
                searchQuery: query,
                currentCategory: category
            });

        } catch (error) {
            console.error('Error Búsqueda API:', error);
            return res.status(500).json({ success: false, message: 'Error buscando productos' });
        }
    }
};