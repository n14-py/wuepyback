// ==========================================================================
// WUEPY.COM - CONTROLADOR CENTRAL DEL SITIO (VERSIÓN API REST)
// ARQUITECTURA BLUEPRINT: MODO INFINITO + INYECCIÓN DE PRODUCTOS + REGENERACIÓN IA
// ==========================================================================
const path = require('path');
const Site = require('../models/Site');
const Product = require('../models/Product'); 
const agentAiService = require('../services/agentAiService');
const { cleanSlug, planOf, subscriptionExpired } = require('../utils/storeRules'); 

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
            const cleanSubdomain = cleanSlug(subdomain, name);
            if (!cleanSubdomain) {
                return res.status(400).json({
                    success: false,
                    message: 'Escribí el nombre del negocio. El enlace no puede quedar vacío ni llamarse undefined.'
                });
            }

            const chosenPlan = planOf(plan);
            const ownedSites = await Site.find({ owner: req.user._id }).select('plan designMode').lean();
            const ownerPlan = ownedSites.reduce((best, site) => {
                const rank = { basico: 1, medio: 2, profesional: 3 };
                return (rank[site.plan] || 0) > (rank[best] || 0) ? site.plan : best;
            }, plan || 'basico');
            const limitPlan = planOf(ownerPlan);
            if (ownedSites.length >= Math.max(chosenPlan.maxSites, limitPlan.maxSites)) {
                return res.status(403).json({
                    success: false,
                    message: `Tu plan permite ${Math.max(chosenPlan.maxSites, limitPlan.maxSites)} tienda(s).`
                });
            }
            if ((designMode === 'ai_generated') && ownedSites.filter(s => s.designMode === 'ai_generated').length >= chosenPlan.aiSites) {
                return res.status(403).json({
                    success: false,
                    message: `El plan ${plan || 'basico'} permite ${chosenPlan.aiSites} web(s) con IA.`
                });
            }

            const existingSite = await Site.findOne({ subdomain: cleanSubdomain });
            if (existingSite) {
                return res.status(400).json({ 
                    success: false, 
                    message: '¡El enlace de la tienda (subdominio) ya está en uso! Por favor elige otro.' 
                });
            }

            const cleanWhatsapp = whatsapp ? whatsapp.replace(/[^0-9]/g, '') : '';

            // Verificar cuántos sitios tiene el usuario para otorgar el trial solo al primero
            const userSitesCount = await Site.countDocuments({ owner: req.user._id });
            
            let initialStatus = 'trial';
            let trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30);

            // Si ya tiene un sitio, los nuevos requieren pago inmediato
            if (userSitesCount > 0) {
                initialStatus = 'pending_payment';
                trialEndDate = null;
            }

            // Creamos el registro en la base de datos
            const newSite = new Site({
                owner: req.user._id,
                name,
                subdomain: cleanSubdomain,
                businessType: businessType || 'otro', 
                plan: plan || 'basico',
                subscriptionStatus: initialStatus, 
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
                message: userSitesCount === 0 ? '¡Felicidades! Tu plataforma fue creada con éxito. ¡Disfruta tu primer mes gratis!' : 'Sitio creado. Requiere pago para activarse.'
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
                name, template, showInMarketplace, designMode, aiPrompt,
                primaryColor, secondaryColor, 
                heroTitle, heroSubtitle, aboutText,
                whatsapp, phone, contactEmail, address, schedule,
                facebook, instagram, tiktok, triggerAiRegen
            } = req.body;

            const site = await Site.findOne({ _id: siteId, owner: req.user._id });
            if (!site) {
                return res.status(403).json({ success: false, message: 'Acceso denegado.' });
            }

            const cleanWhatsapp = whatsapp ? whatsapp.replace(/[^0-9]/g, '') : '';
            const isShowInMarketplace = showInMarketplace === 'on' || showInMarketplace === true || showInMarketplace === 'true';

            // SOLUCIÓN AL ERROR DE PÉRDIDA DE IA:
            // Solo actualizamos designMode si se envía explícitamente y es diferente
            if (designMode && designMode !== site.designMode) {
                site.designMode = designMode;
            }
            if (aiPrompt !== undefined) site.aiPrompt = aiPrompt;

            // Si el sitio es IA, no sobreescribimos el template con valores basura del formulario
            if (site.designMode !== 'ai_generated' && template) {
                site.template = template;
            }

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

            site.name = name || site.name;
            site.showInMarketplace = isShowInMarketplace; 
            site.primaryColor = primaryColor || site.primaryColor;
            site.secondaryColor = secondaryColor || site.secondaryColor;
            
            site.content = { 
                heroTitle: heroTitle !== undefined ? heroTitle : site.content.heroTitle, 
                heroSubtitle: heroSubtitle !== undefined ? heroSubtitle : site.content.heroSubtitle, 
                aboutText: aboutText !== undefined ? aboutText : site.content.aboutText 
            };
            site.contact = {
                whatsapp: cleanWhatsapp,
                phone: phone || whatsapp,
                email: contactEmail !== undefined ? contactEmail : site.contact.email,
                address: address !== undefined ? address : site.contact.address,
                schedule: schedule !== undefined ? schedule : site.contact.schedule
            };
            site.social = { 
                facebook: facebook !== undefined ? facebook : site.social.facebook, 
                instagram: instagram !== undefined ? instagram : site.social.instagram, 
                tiktok: tiktok !== undefined ? tiktok : site.social.tiktok 
            };

            if (req.file) site.logoUrl = req.file.path; 

            await site.save();

            // Si el usuario marcó regenerar con IA de forma amigable o cambió la idea
            if ((triggerAiRegen === true || triggerAiRegen === 'true') && site.designMode === 'ai_generated' && site.aiPrompt) {
                console.log(`[API Wuepy] 🔄 Regeneración Inteligente activada desde Configuraciones para: ${site.subdomain}`);
                await agentAiService.orquestarDisenoWeb(site._id, site.aiPrompt);
                // Volvemos a buscar el sitio actualizado por la IA para retornarlo
                const updatedSite = await Site.findById(siteId);
                return res.status(200).json({ success: true, message: '¡Configuración e idea guardada! La IA ha rediseñado tu web.', site: updatedSite });
            }

            return res.status(200).json({ success: true, message: '¡Configuración guardada correctamente!', site });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Error al actualizar.' });
        }
    },

    // =========================================================
    // 🔥 BOTÓN DE LA DESTRUCCIÓN / ACTUALIZACIÓN DIRECTA IA 🔥
    // =========================================================
    regenerateAiDesign: async (req, res) => {
        try {
            const siteId = req.params.siteId;
            const { aiPrompt } = req.body;

            const site = await Site.findOne({ _id: siteId, owner: req.user._id });
            if (!site) return res.status(403).json({ success: false, message: 'Acceso denegado o tienda no encontrada.' });

            const finalPrompt = aiPrompt || site.aiPrompt;
            if (!finalPrompt) return res.status(400).json({ success: false, message: 'Se necesita una idea para que la IA trabaje.' });

            const limits = planOf(site.plan);
            const month = new Date().toISOString().slice(0, 7);
            if (!site.aiUsage || site.aiUsage.month !== month) site.aiUsage = { month, count: 0 };
            if (site.aiUsage.count >= limits.aiUpdatesPerMonth) {
                return res.status(403).json({ success: false, message: `Este mes ya usaste las ${limits.aiUpdatesPerMonth} actualizaciones de IA de tu plan.` });
            }

            console.log(`[API Wuepy] 💥 Regenerando sitio IA para ${site.subdomain}`);
            
            const aiResult = await agentAiService.orquestarDisenoWeb(site._id, finalPrompt);

            if (!aiResult.success) {
                return res.status(500).json({ success: false, message: 'Error de la IA al regenerar: ' + aiResult.error });
            }

            const nextCount = (site.aiUsage.count || 0) + 1;
            await Site.updateOne({ _id: site._id }, {
                $set: {
                    designMode: 'ai_generated',
                    aiPrompt: finalPrompt,
                    'aiUsage.month': month,
                    'aiUsage.count': nextCount
                }
            });

            return res.status(200).json({ success: true, message: '¡Diseño regenerado con éxito! Revisa tu tienda.', aiUpdatesThisMonth: nextCount });

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
            
            // Lógica del muro de pago y estado
            let needsPayment = false;
            
            if (subscriptionExpired(site)) {
                if (site.subscriptionStatus !== 'suspended' && site.subscriptionStatus !== 'pending_payment') {
                    site.subscriptionStatus = 'expired';
                    await site.save();
                }
                needsPayment = true;
            }

            await Site.updateOne({ _id: site._id }, { $inc: { views: 1 } });

            const paymentAlias = process.env.ADMIN_PAYMENT_ALIAS || 'WUEPY.PAGOS';

            // =========================================================
            // 🔥 MAGIA DE LA IA: DETECCIÓN Y RENDERIZACIÓN MULTIPÁGINA
            // =========================================================
            if (site.designMode === 'ai_generated' && site.aiGeneratedPages && site.aiGeneratedPages.length > 0) {
                const requestedPageName = req.query.page || 'index.html';
                let targetPage = site.aiGeneratedPages.find(p => p.filename === requestedPageName);
                
                if (!targetPage) {
                    targetPage = site.aiGeneratedPages.find(p => p.filename === 'index.html');
                }

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
                    products,    
                    categories,  
                    needsPayment,
                    paymentAlias,
                    message: needsPayment ? 'Tienda requiere pago para habilitarse por completo' : 'Esta tienda es servida por la Bóveda IA de Wuepy'
                });
            }

            // MODO CLÁSICO
            const products = await Product.find({ site: site._id, isActive: { $ne: false } })
                                          .sort({ createdAt: -1 })
                                          .limit(12).lean();

            const categories = await Product.distinct('category', { site: site._id, isActive: { $ne: false } });

            return res.status(200).json({
                success: true,
                isAiGenerated: false,
                site,
                products,
                categories,
                needsPayment,
                paymentAlias
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

            let needsPayment = false;
            if (subscriptionExpired(site)) {
                if (site.subscriptionStatus !== 'suspended' && site.subscriptionStatus !== 'pending_payment') {
                    site.subscriptionStatus = 'expired';
                    await site.save();
                }
                needsPayment = true;
            }
            const paymentAlias = process.env.ADMIN_PAYMENT_ALIAS || 'WUEPY.PAGOS';

            const product = await Product.findOne({ _id: productId, site: site._id }).lean();
            if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

            await Product.updateOne({ _id: productId }, { $inc: { views: 1 } });

            const related = await Product.find({ 
                site: site._id, 
                category: product.category, 
                _id: { $ne: product._id }, 
                isActive: { $ne: false }
            }).limit(4).lean();

            // =========================================================
            // 🔥 SOLUCIÓN CRÍTICA: ENVIAR PLANTILLA product.html AL FRONTEND 🔥
            // =========================================================
            if (site.designMode === 'ai_generated' && site.aiGeneratedPages && site.aiGeneratedPages.length > 0) {
                let targetPage = site.aiGeneratedPages.find(p => p.filename === 'product.html');
                
                if (!targetPage) targetPage = site.aiGeneratedPages.find(p => p.filename === 'index.html');

                return res.status(200).json({
                    success: true,
                    isAiGenerated: true,
                    activePage: 'product.html',
                    htmlContent: targetPage ? targetPage.htmlContent : '',
                    site,
                    product,
                    related,
                    needsPayment,
                    paymentAlias
                });
            }

            // MODO CLÁSICO
            return res.status(200).json({
                success: true,
                isAiGenerated: false,
                site,
                product,
                related,
                needsPayment,
                paymentAlias
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

            let needsPayment = false;
            if (subscriptionExpired(site)) {
                if (site.subscriptionStatus !== 'suspended' && site.subscriptionStatus !== 'pending_payment') {
                    site.subscriptionStatus = 'expired';
                    await site.save();
                }
                needsPayment = true;
            }
            const paymentAlias = process.env.ADMIN_PAYMENT_ALIAS || 'WUEPY.PAGOS';

            let filter = { site: site._id, isActive: { $ne: false } };
            
            if (query) {
                filter.$text = { $search: query };
            }
            
            if (category) filter.category = category;

            const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
            const categories = await Product.distinct('category', { site: site._id, isActive: { $ne: false } });

            // =========================================================
            // 🔥 SOLUCIÓN CRÍTICA: ENVIAR PLANTILLA catalogo.html AL FRONTEND 🔥
            // =========================================================
            if (site.designMode === 'ai_generated' && site.aiGeneratedPages && site.aiGeneratedPages.length > 0) {
                let targetPage = site.aiGeneratedPages.find(p => p.filename === 'catalogo.html');
                
                if (!targetPage) targetPage = site.aiGeneratedPages.find(p => p.filename === 'index.html');

                return res.status(200).json({
                    success: true,
                    isAiGenerated: true,
                    activePage: 'catalogo.html',
                    htmlContent: targetPage ? targetPage.htmlContent : '',
                    site,
                    products,
                    categories,
                    searchQuery: query,
                    currentCategory: category,
                    needsPayment,
                    paymentAlias
                });
            }

            // MODO CLÁSICO
            return res.status(200).json({
                success: true,
                isAiGenerated: false,
                site,
                products,
                categories,
                searchQuery: query,
                currentCategory: category,
                needsPayment,
                paymentAlias
            });

        } catch (error) {
            console.error('Error Búsqueda API:', error);
            return res.status(500).json({ success: false, message: 'Error buscando productos' });
        }
    },

    buildSitemap: async (req, res) => {
        try {
            const subdomain = req.params.subdomain;
            const site = await Site.findOne({ subdomain }).lean();
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });
            const products = await Product.find({ site: site._id, isActive: { $ne: false } }).select('_id updatedAt').lean();
            const origin = `https://${site.subdomain}.wuepy.com`;
            const urls = [origin + '/', origin + '/search.html'];
            products.forEach(p => urls.push(`${origin}/p/${p._id}`));
            const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
                urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>';
            res.set('Content-Type', 'application/xml; charset=utf-8');
            return res.status(200).send(xml);
        } catch (error) {
            return res.status(500).json({ success: false, message: 'No se pudo armar el sitemap.' });
        }
    }
};