// ==========================================================================
// WUEPY.COM - CONTROLADOR CENTRAL DEL SITIO (VERSIÓN API REST)
// ARQUITECTURA BLUEPRINT: MODO INFINITO + INYECCIÓN DE PRODUCTOS + REGENERACIÓN IA
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
            
            // Limpieza absoluta del subdominio para evitar caracteres raros
            const cleanSubdomain = subdomain.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');

            // Verificamos si alguien más ya tomó este nombre
            const existingSite = await Site.findOne({ subdomain: cleanSubdomain });
            if (existingSite) {
                return res.status(400).json({ 
                    success: false, 
                    message: '¡El enlace de la tienda (subdominio) ya está en uso! Por favor elige otro.' 
                });
            }

            const cleanWhatsapp = whatsapp ? whatsapp.replace(/[^0-9]/g, '') : '';

            // 1 mes de prueba gratis automático
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30);

            // Creamos el registro en la base de datos
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

            // Si subieron un logo, Multer y Cloudflare R2 ya lo guardaron y nos dan la URL
            if (req.file) newSite.logoUrl = req.file.path; 

            await newSite.save();

            // =========================================================
            // 🔥 ACTIVACIÓN DEL ORQUESTADOR IA (NÚCLEO INFINITO) 🔥
            // =========================================================
            if (newSite.designMode === 'ai_generated' && newSite.aiPrompt) {
                console.log(`[API Wuepy] 🧠 Despertando a DeepSeek para la tienda: ${newSite.subdomain}`);
                
                const aiResult = await agentAiService.orquestarDisenoWeb(newSite._id, newSite.aiPrompt);
                
                if (!aiResult.success) {
                    console.error("Error orquestando IA:", aiResult.error);
                    return res.status(201).json({ 
                        success: true, 
                        siteId: newSite._id,
                        message: 'Tu negocio fue creado, pero la Inteligencia Artificial falló al armar el diseño. Se aplicará el diseño clásico.' 
                    });
                }
            }

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

            // =========================================================
            // 🔄 SINCRONIZACIÓN AUTOMÁTICA DE DATOS EN PLANTILLA IA
            // =========================================================
            if (site.designMode === 'ai_generated' && site.aiGeneratedPages && site.aiGeneratedPages.length > 0) {
                const oldWhatsapp = site.contact?.whatsapp || '';
                const oldEmail = site.contact?.email || '';
                const oldAddress = site.contact?.address || '';
                const oldPrimary = site.primaryColor || '#3b82f6';
                const oldSecondary = site.secondaryColor || '#1e293b';
                const oldName = site.name || '';
                const oldAboutText = site.content?.aboutText || '';

                site.aiGeneratedPages = site.aiGeneratedPages.map(page => {
                    let html = page.htmlContent;
                    if (oldWhatsapp && cleanWhatsapp) html = html.split(oldWhatsapp).join(cleanWhatsapp);
                    if (oldEmail && contactEmail) html = html.split(oldEmail).join(contactEmail);
                    if (oldAddress && address) html = html.split(oldAddress).join(address);
                    if (oldPrimary && primaryColor) html = html.split(oldPrimary).join(primaryColor);
                    if (oldSecondary && secondaryColor) html = html.split(oldSecondary).join(secondaryColor);
                    if (oldName && name) html = html.split(oldName).join(name);
                    if (oldAboutText && aboutText) html = html.split(oldAboutText).join(aboutText);
                    return { filename: page.filename, htmlContent: html };
                });
            }

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

    // =========================================================
    // 🔥 NUEVO: BOTÓN DE LA DESTRUCCIÓN (REGENERAR DISEÑO IA) 🔥
    // =========================================================
    regenerateAiDesign: async (req, res) => {
        try {
            const siteId = req.params.siteId;
            const { aiPrompt } = req.body;

            const site = await Site.findOne({ _id: siteId, owner: req.user._id });
            if (!site) return res.status(403).json({ success: false, message: 'Acceso denegado o tienda no encontrada.' });

            const finalPrompt = aiPrompt || site.aiPrompt;
            if (!finalPrompt) return res.status(400).json({ success: false, message: 'Se necesita una idea para que la IA trabaje.' });

            console.log(`[API Wuepy] 💥 BOTÓN DE DESTRUCCIÓN: Regenerando sitio IA para ${site.subdomain}`);
            
            // Llamamos de vuelta al motor infinito
            const aiResult = await agentAiService.orquestarDisenoWeb(site._id, finalPrompt);

            if (!aiResult.success) {
                return res.status(500).json({ success: false, message: 'Error de la IA al regenerar: ' + aiResult.error });
            }

            return res.status(200).json({ success: true, message: '¡Diseño destruido y regenerado con éxito! Revisa tu tienda.' });

        } catch (error) {
            console.error("Error al regenerar diseño IA:", error);
            return res.status(500).json({ success: false, message: 'Error interno al regenerar la web.' });
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
            const subdomain = req.subdomainName || req.params.subdomain;
            const site = await Site.findOne({ subdomain });
            
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada', errorCode: 'NOT_FOUND' });
            
            if (!site.isActive || site.subscriptionStatus === 'suspended') {
                return res.status(403).json({ success: false, message: 'Tienda suspendida por falta de pago o inactividad', errorCode: 'SUSPENDED' });
            }

            await Site.updateOne({ _id: site._id }, { $inc: { views: 1 } });

            // =========================================================
            // 🔥 MAGIA DE LA IA: DETECCIÓN Y RENDERIZACIÓN MULTIPÁGINA
            // =========================================================
            if (site.designMode === 'ai_generated' && site.aiGeneratedPages && site.aiGeneratedPages.length > 0) {
                const requestedPageName = req.query.page || 'index.html';
                let targetPage = site.aiGeneratedPages.find(p => p.filename === requestedPageName);
                
                if (!targetPage) {
                    targetPage = site.aiGeneratedPages.find(p => p.filename === 'index.html');
                }

                // 🟢 SOLUCIÓN: BUSCAMOS LOS PRODUCTOS IGUAL QUE EN EL MODO CLÁSICO Y LOS MANDAMOS AL FRONTEND
                const products = await Product.find({ site: site._id, isActive: { $ne: false } })
                                              .sort({ createdAt: -1 })
                                              .limit(12).lean();

                const categories = await Product.distinct('category', { site: site._id, isActive: { $ne: false } });

                return res.status(200).json({
                    success: true,
                    isAiGenerated: true,
                    activePage: targetPage.filename,
                    htmlContent: targetPage.htmlContent,
                    aiPages: site.aiGeneratedPages, 
                    site,
                    products,    // <- PRODUCTOS LISTOS PARA EL INYECTOR DEL FRONTEND
                    categories,  // <- CATEGORÍAS LISTAS
                    message: 'Esta tienda es servida por la Bóveda IA de Wuepy directamente desde la Base de Datos'
                });
            }

            // Si es una tienda normal con plantilla tradicional, cargamos sus productos
            const products = await Product.find({ site: site._id, isActive: { $ne: false } })
                                          .sort({ createdAt: -1 })
                                          .limit(12).lean();

            const categories = await Product.distinct('category', { site: site._id, isActive: { $ne: false } });

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
            const productId = req.params.id; 

            if (!productId) {
                 return res.status(400).json({ success: false, message: 'ID de producto no proporcionado' });
            }

            const site = await Site.findOne({ subdomain });
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

            const product = await Product.findOne({ _id: productId, site: site._id }).lean();
            if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

            await Product.updateOne({ _id: productId }, { $inc: { views: 1 } });

            const related = await Product.find({ 
                site: site._id, 
                category: product.category, 
                _id: { $ne: product._id }, 
                isActive: { $ne: false }
            }).limit(4).lean();

            return res.status(200).json({
                success: true,
                site,
                product,
                related
            });

        } catch (error) {
            console.error('Error Producto API:', error);
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

            let filter = { site: site._id, isActive: { $ne: false } };
            
            if (query) {
                filter.$text = { $search: query };
            }
            
            if (category) filter.category = category;

            const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
            const categories = await Product.distinct('category', { site: site._id, isActive: { $ne: false } });

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