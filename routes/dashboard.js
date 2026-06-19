// ==========================================================================
// EL CEREBRO DE WUEPY - ENRUTADOR DEL PANEL (VERSIÓN API REST DEFINITIVA)
// ==========================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const siteController = require('../controllers/siteController');

// Modelos de la Base de Datos
const Site = require('../models/Site');
const Product = require('../models/Product'); 
const Sale = require('../models/Sale'); 
const Expense = require('../models/Expense'); 

// Servicio de Inteligencia Artificial (Orquestador)
const agentAiService = require('../services/agentAiService');

// Aduana de Seguridad
const { ensureAuthenticated, ensureStoreOwner, ensureSiteAccess } = require('../middleware/auth');

// ==========================================================================
// 1. SISTEMA DE ARCHIVOS (CLOUDFLARE R2 PARA LOGOS, BANNERS Y COMPROBANTES)
// ==========================================================================
const R2Storage = require('../utils/r2Storage');

const r2StorageEngine = new R2Storage({
    endpoint: process.env.R2_ENDPOINT, 
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
    bucket: process.env.R2_BUCKET_NAME,
    publicDomain: process.env.R2_PUBLIC_DOMAIN 
});

const upload = multer({ 
    storage: r2StorageEngine,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) { return cb(null, true); }
        cb(new Error('Formato de archivo no soportado.'));
    }
});

// ==========================================================================
// 2. PANEL PRINCIPAL (MIS TIENDAS) Y SEMÁFORO DE ROLES
// ==========================================================================
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        // SEMÁFORO DE ROLES: Informar al Frontend/Flutter qué rol tiene el usuario para redireccionarlo en el cliente
        if (req.user.isEmployee && req.user.siteId) {
            if (req.user.role === 'delivery') {
                return res.status(200).json({ success: true, redirectTarget: 'delivery-panel', siteId: req.user.siteId });
            }
            if (req.user.role === 'ventas') {
                return res.status(200).json({ success: true, redirectTarget: 'pos', siteId: req.user.siteId });
            }
            return res.status(200).json({ success: true, redirectTarget: 'site-overview', siteId: req.user.siteId });
        }

        // Si es el dueño, devolvemos sus tiendas
        const sites = await Site.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, user: req.user, sites: sites });
    } catch (error) {
        console.error('Error Crítico en Dashboard Index:', error);
        return res.status(500).json({ success: false, message: 'Hubo un error al cargar tus tiendas.' });
    }
});

// ==========================================================================
// 3. CREACIÓN DE TIENDAS Y CONFIGURACIÓN (SAAS CORE)
// ==========================================================================

// GET para validar acceso a creación (Opcional en API, pero útil para chequeos)
router.get('/create-site', ensureStoreOwner, (req, res) => {
    return res.status(200).json({ success: true, message: 'Acceso autorizado para crear tienda', user: req.user });
});

router.post('/create-site', ensureStoreOwner, upload.single('logo'), async (req, res) => {
    try {
        const { 
            name, subdomain, designMode, aiPrompt, plan, requestSupport, 
            startupStory, contactEmail, whatsapp, currency
        } = req.body;

        const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        const existingSite = await Site.findOne({ subdomain: cleanSubdomain });
        
        if (existingSite) {
            return res.status(400).json({ success: false, message: 'Ese subdominio ya pertenece a otra tienda.' });
        }

        const isRequestingSupport = requestSupport === 'on' || requestSupport === true || requestSupport === 'true';
        let logoUrl = req.file ? req.file.path : '';
        const cleanWhatsapp = whatsapp ? whatsapp.replace(/[^0-9]/g, '') : '';

        // Creamos la tienda base
        const newSite = new Site({
            owner: req.user._id,
            name,
            subdomain: cleanSubdomain,
            plan: plan || 'basico',
            requestSupport: isRequestingSupport,
            startupStory: isRequestingSupport ? startupStory : '',
            freeMonths: isRequestingSupport ? 6 : 1, 
            designMode: designMode || 'template',
            aiPrompt: designMode === 'ai_generated' ? aiPrompt : '',
            currency: currency || 'PYG',
            logoUrl: logoUrl,
            contact: { email: contactEmail || req.user.email, whatsapp: cleanWhatsapp },
            subscriptionStatus: 'trial', 
            trialEndsAt: new Date(new Date().setMonth(new Date().getMonth() + (isRequestingSupport ? 6 : 1)))
        });

        await newSite.save();

        // Si eligió el plan con IA, llamamos a nuestro Orquestador Gemini
        if (designMode === 'ai_generated' && aiPrompt) {
            await agentAiService.orquestarDisenoWeb(newSite._id, aiPrompt);
        }

        return res.status(201).json({ success: true, message: '¡La infraestructura de tu tienda ha sido desplegada!', siteId: newSite._id });
    } catch (error) {
        console.error('Error al crear tienda:', error);
        return res.status(500).json({ success: false, message: 'Error en los servidores al crear la tienda.' });
    }
});

// VISTA GENERAL Y PROTECCIÓN DE RUTAS
router.get('/site/:siteId', ensureSiteAccess, async (req, res) => {
    try {
        // FILTRO DE SEGURIDAD
        if (req.user.isEmployee) {
            if (req.user.role === 'delivery') return res.status(403).json({ success: false, redirectTarget: 'delivery-panel', siteId: req.params.siteId });
            if (req.user.role === 'ventas') return res.status(403).json({ success: false, redirectTarget: 'pos', siteId: req.params.siteId });
        }

        const site = await Site.findOne({ _id: req.params.siteId }).lean();
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        const productsCount = await Product.countDocuments({ site: site._id });
        const stats = { views: site.views || 0, products: productsCount };

        return res.status(200).json({ success: true, user: req.user, site, stats });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al cargar la tienda.' });
    }
});

// AJUSTES DE TIENDA (SETTINGS)
router.get('/site/:siteId/settings', ensureStoreOwner, async (req, res) => {
    try {
        const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id }).lean();
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });
        return res.status(200).json({ success: true, user: req.user, site });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al cargar configuraciones.' });
    }
});

router.post('/site/:siteId/update-general', ensureStoreOwner, async (req, res) => {
    try {
        const { name, whatsapp, address, heroTitle, aboutText, facebook, instagram, tiktok, showInMarketplace } = req.body;
        const cleanWhatsapp = whatsapp ? whatsapp.replace(/[^0-9]/g, '') : '';
        const isShowInMarketplace = showInMarketplace === 'on' || showInMarketplace === true || showInMarketplace === 'true';
        
        await Site.findOneAndUpdate(
            { _id: req.params.siteId, owner: req.user._id },
            { 
                $set: {
                    name, showInMarketplace: isShowInMarketplace,
                    'contact.whatsapp': cleanWhatsapp, 'contact.address': address,
                    'content.heroTitle': heroTitle, 'content.aboutText': aboutText,
                    'social.facebook': facebook, 'social.instagram': instagram, 'social.tiktok': tiktok
                }
            }
        );
        return res.status(200).json({ success: true, message: 'Información general actualizada.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'No se pudieron guardar los datos.' });
    }
});

router.post('/site/:siteId/update-design', ensureStoreOwner, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), async (req, res) => {
    try {
        const { currency, template, primaryColor, secondaryColor } = req.body;
        const updateData = { currency: currency || 'PYG', template, primaryColor, secondaryColor, designMode: 'template' };

        if (req.files && req.files['logo']) updateData.logoUrl = req.files['logo'][0].path;
        if (req.files && req.files['banner']) updateData.bannerUrl = req.files['banner'][0].path;

        const updatedSite = await Site.findOneAndUpdate({ _id: req.params.siteId, owner: req.user._id }, { $set: updateData }, { new: true });
        
        return res.status(200).json({ success: true, message: '¡La apariencia de tu tienda ha sido renovada!', site: updatedSite });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al modificar el diseño.' });
    }
});

// ==========================================================================
// 4. FACTURACIÓN Y PAGOS DEL SAAS (DUEÑOS PAGANDO A WUEPY)
// ==========================================================================
router.get('/site/:siteId/billing', ensureStoreOwner, async (req, res) => {
    try {
        const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id }).lean();
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });
        return res.status(200).json({ success: true, user: req.user, site });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error de conexión.' });
    }
});

// RUTA VITAL: Recibe la foto del comprobante de transferencia
router.post('/billing/upload-receipt', ensureStoreOwner, upload.single('receiptImage'), async (req, res) => {
    try {
        const { siteId, planRequested, amount, monthsPaid, aliasOrBankUsed } = req.body;
        const site = await Site.findOne({ _id: siteId, owner: req.user._id });
        
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Debes subir una foto o PDF del comprobante de transferencia.' });
        }

        // Insertamos el comprobante en el array del modelo Site
        site.paymentReceipts.push({
            amount: Number(amount),
            receiptUrl: req.file.path, 
            planRequested: planRequested,
            monthsPaid: Number(monthsPaid),
            aliasOrBankUsed: aliasOrBankUsed,
            status: 'pending',
            submittedAt: new Date()
        });

        await site.save();

        return res.status(200).json({ success: true, message: '¡Comprobante enviado con éxito! El equipo de Wuepy verificará tu pago y activará tu tienda a la brevedad.' });
    } catch (error) {
        console.error('Error procesando pago:', error);
        return res.status(500).json({ success: false, message: 'Ocurrió un problema de red al enviar el comprobante. Intenta de nuevo.' });
    }
});

// ==========================================================================
// 5. EMPLEADOS (CREAR Y ELIMINAR ACCESOS)
// ==========================================================================
router.post('/site/:siteId/employees/add', ensureStoreOwner, async (req, res) => {
    try {
        const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id });
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        const { name, email, password, role, phone } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        site.employees.push({ 
            name, email: email.toLowerCase(), password: hashedPassword, role,
            phone: phone ? phone.replace(/[^0-9]/g, '') : '', isActive: true
        });
        await site.save();

        return res.status(201).json({ success: true, message: `Credenciales creadas para ${name} (Rol: ${role}).` });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error de base de datos al registrar personal.' });
    }
});

router.post('/site/:siteId/employees/delete/:empId', ensureStoreOwner, async (req, res) => {
    try {
        const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id });
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        site.employees.pull({ _id: req.params.empId });
        await site.save();

        return res.status(200).json({ success: true, message: 'Acceso revocado y empleado eliminado.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Fallo al eliminar los permisos.' });
    }
});

// ==========================================================================
// 6. APLICACIÓN MÓVIL DEL REPARTIDOR 
// ==========================================================================
router.get('/site/:siteId/delivery-panel', ensureSiteAccess, async (req, res) => {
    try {
        const site = await Site.findOne({ _id: req.params.siteId }).lean();
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        const orders = await Sale.find({
            site: site._id,
            'delivery.assignedTo': req.user._id,
            status: 'in_transit' 
        }).sort({ createdAt: -1 }).lean();

        return res.status(200).json({ success: true, user: req.user, site, orders });
    } catch (error) {
        console.error('Error cargando app de delivery:', error);
        return res.status(500).json({ success: false, message: 'Error al cargar tus pedidos.' });
    }
});

// Endpoint para que el repartidor marque como entregado
router.post('/site/:siteId/deliveries/status', ensureSiteAccess, async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const sale = await Sale.findOne({ _id: orderId, site: req.params.siteId });
        if (!sale) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
        
        if (req.user.role === 'delivery' && sale.delivery.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'No tienes permiso sobre este pedido' });
        }

        sale.status = status;
        if (status === 'completed') {
            sale.delivery.deliveredAt = new Date();
            if (sale.paymentMethod === 'efectivo') {
                sale.paymentStatus = 'paid';
            }
        }

        await sale.save();
        return res.status(200).json({ success: true, message: 'Pedido entregado exitosamente' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error de conexión' });
    }
});

// ==========================================================================
// 7. INVENTARIO (ACCESO COMPARTIDO DUEÑO/EMPLEADO)
// ==========================================================================
router.get('/site/:siteId/inventory', ensureSiteAccess, async (req, res) => {
    try {
        const site = await Site.findOne({ _id: req.params.siteId }).lean();
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        const products = await Product.find({ site: site._id }).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, user: req.user, site, products });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al sincronizar inventario.' });
    }
});

router.post('/inventory/add', ensureSiteAccess, upload.single('image'), async (req, res) => {
    const { siteId } = req.body;
    try {
        const site = await Site.findOne({ _id: siteId });
        const { name, category, sku, price, compareAtPrice, stock, lowStockThreshold, description, isActive } = req.body;
        let imageUrl = req.file ? req.file.path : '';
        const isProductActive = isActive === 'true' || isActive === true;

        const newProduct = new Product({
            site: site._id, name, category, sku, price: Number(price), 
            compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
            stock: Number(stock), lowStockThreshold: Number(lowStockThreshold),
            description, imageUrl, isActive: isProductActive
        });

        await newProduct.save();
        return res.status(201).json({ success: true, message: 'Mercancía ingresada correctamente.', product: newProduct });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al procesar el ingreso de mercadería.' });
    }
});

router.post('/inventory/edit/:productId', ensureSiteAccess, upload.single('image'), async (req, res) => {
    const { siteId } = req.body;
    try {
        const site = await Site.findOne({ _id: siteId });
        const { name, category, sku, price, compareAtPrice, stock, lowStockThreshold, description, isActive } = req.body;
        const isProductActive = isActive === 'true' || isActive === true;

        const updateData = { 
            name, category, sku, price: Number(price), 
            compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
            stock: Number(stock), lowStockThreshold: Number(lowStockThreshold),
            description, isActive: isProductActive
        };
        if (req.file) updateData.imageUrl = req.file.path;

        await Product.findOneAndUpdate({ _id: req.params.productId, site: site._id }, { $set: updateData });
        return res.status(200).json({ success: true, message: 'Actualización de producto completada.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al modificar registro.' });
    }
});

router.post('/inventory/delete/:productId', ensureSiteAccess, async (req, res) => {
    const { siteId } = req.body;
    try {
        await Product.findOneAndDelete({ _id: req.params.productId, site: siteId });
        return res.status(200).json({ success: true, message: 'Producto purgado de la base de datos.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'No se pudo eliminar el producto.' });
    }
});

// ==========================================================================
// 8. TERMINAL POS Y CAJA
// ==========================================================================
router.get('/site/:siteId/pos', ensureSiteAccess, async (req, res) => {
    try {
        const site = await Site.findOne({ _id: req.params.siteId }).lean();
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });
        
        const products = await Product.find({ site: site._id, isActive: true }).lean();
        const deliveries = (site.employees || []).filter(e => e.role === 'delivery' && e.isActive);

        return res.status(200).json({ success: true, user: req.user, site, products, deliveries });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al abrir la caja registradora.' });
    }
});

router.post('/site/:siteId/pos/checkout', ensureSiteAccess, async (req, res) => {
    try {
        const siteId = req.params.siteId;
        const site = await Site.findOne({ _id: siteId });
        
        const { 
            cartData, totalAmount, paymentMethod, saleChannel,
            requiresDelivery, deliveryAddress, assignedDeliveryId,
            customerName, customerPhone, discount, deliveryFee
        } = req.body;

        // Soporte robusto por si el frontend envía un string (FormData) o un Array JSON directo
        let cart = typeof cartData === 'string' ? JSON.parse(cartData) : cartData;
        
        if (!cart || cart.length === 0) return res.status(400).json({ success: false, message: 'El carrito está vacío.' });

        const finalItems = [];
        for (let item of cart) {
            if (!item.isCustom) {
                const product = await Product.findOneAndUpdate(
                    { _id: item._id, site: site._id, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity } },
                    { new: true }
                );
                if(!product) {
                    return res.status(400).json({ success: false, message: `Stock insuficiente para: ${item.name}` });
                }
                finalItems.push({ productId: product._id, name: product.name, price: item.price, quantity: item.quantity, isCustom: false });
            } else {
                finalItems.push({ productId: null, name: item.name, price: item.price, quantity: item.quantity, isCustom: true });
            }
        }

        const isDelivery = requiresDelivery === 'on' || requiresDelivery === true || requiresDelivery === 'true';
        
        const newSale = new Sale({
            site: site._id,
            registeredBy: req.user._id,
            saleChannel: saleChannel || 'pos',
            customer: { name: customerName || 'Ocasional', phone: customerPhone || '' },
            items: finalItems,
            subtotal: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0),
            discount: Number(discount) || 0,
            deliveryFee: Number(deliveryFee) || 0,
            totalAmount: Number(totalAmount),
            paymentMethod: paymentMethod || 'efectivo',
            paymentStatus: paymentMethod === 'efectivo' && !isDelivery ? 'paid' : 'pending',
            requiresDelivery: isDelivery,
            status: isDelivery ? 'in_transit' : 'completed' 
        });

        if (isDelivery) {
            newSale.delivery = { address: deliveryAddress || '', assignedTo: assignedDeliveryId || '' };
        }

        await newSale.save();
        return res.status(201).json({ success: true, message: `¡Ticket Registrado! Monto: ${site.currency === 'PYG' ? 'Gs.' : '$'} ${Number(totalAmount).toLocaleString('es-ES')}` });

    } catch (error) {
        console.error("Error en POS checkout:", error);
        return res.status(500).json({ success: false, message: 'Error procesando cobro.' });
    }
});

// ==========================================================================
// 9. FINANZAS Y REPORTES PDF (SÓLO DUEÑOS)
// ==========================================================================
router.get('/site/:siteId/finances', ensureStoreOwner, async (req, res) => {
    try {
        const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id }).lean();
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const dailySalesAgg = await Sale.aggregate([
            { $match: { site: site._id, createdAt: { $gte: startOfDay }, status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]);

        const monthlySalesAgg = await Sale.aggregate([
            { $match: { site: site._id, createdAt: { $gte: startOfMonth }, status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
        ]);

        const monthlyExpensesAgg = await Expense.aggregate([
            { $match: { site: site._id, date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const products = await Product.find({ site: site._id }).lean();
        let stockValue = products.reduce((acc, p) => acc + (p.stock > 0 ? (p.stock * p.price) : 0), 0);

        const stats = {
            dailyTotal: dailySalesAgg.length > 0 ? dailySalesAgg[0].total : 0,
            dailyCount: dailySalesAgg.length > 0 ? dailySalesAgg[0].count : 0,
            monthlyTotal: monthlySalesAgg.length > 0 ? monthlySalesAgg[0].total : 0,
            monthlyCount: monthlySalesAgg.length > 0 ? monthlySalesAgg[0].count : 0,
            monthlyExpenses: monthlyExpensesAgg.length > 0 ? monthlyExpensesAgg[0].total : 0,
            stockValue: stockValue
        };

        const recentSales = await Sale.find({ site: site._id }).sort({ createdAt: -1 }).limit(10).lean();
        const recentExpenses = await Expense.find({ site: site._id }).sort({ date: -1 }).limit(10).lean();

        return res.status(200).json({ success: true, user: req.user, site, stats, recentSales, recentExpenses });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Fallo al procesar métricas contables.' });
    }
});

router.post('/site/:siteId/expenses/add', ensureStoreOwner, async (req, res) => {
    try {
        const { description, amount, category } = req.body;
        const newExp = new Expense({ site: req.params.siteId, description, amount: Number(amount), category: category || 'Operativo' });
        await newExp.save();
        return res.status(201).json({ success: true, message: 'Egreso contabilizado.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Error al asentar la factura/egreso.' });
    }
});

// MOTOR DE EXPORTACIÓN A PDF (Este lo mantenemos con `res.setHeader` para que la app pueda descargar el archivo binario)
router.get('/site/:siteId/finances/export', ensureStoreOwner, async (req, res) => {
    try {
        const site = await Site.findOne({ _id: req.params.siteId, owner: req.user._id }).lean();
        if (!site) return res.status(404).json({ success: false, message: 'Sitio no encontrado' });

        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const sales = await Sale.find({ site: site._id, createdAt: { $gte: startOfMonth }, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }).lean();
        const expenses = await Expense.find({ site: site._id, date: { $gte: startOfMonth } }).sort({ date: -1 }).lean();

        const totalSales = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);
        const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const curSym = site.currency === 'PYG' ? 'Gs.' : '$';

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-disposition', `attachment; filename=Reporte_Mensual_${site.name.replace(/ /g, '_')}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        doc.fontSize(24).font('Helvetica-Bold').text(`${site.name} - Reporte Financiero`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').text(`Mes: ${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(14).font('Helvetica-Bold').text('RESUMEN DEL MES', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica')
           .text(`Ingresos Brutos: ${curSym} ${totalSales.toLocaleString('es-ES')}`)
           .text(`Total Egresos: - ${curSym} ${totalExpenses.toLocaleString('es-ES')}`)
           .moveDown(0.5);
        
        doc.font('Helvetica-Bold').text(`GANANCIA NETA: ${curSym} ${(totalSales - totalExpenses).toLocaleString('es-ES')}`);
        doc.end();

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Ocurrió un error en los servidores al generar el reporte.' });
    }
});

// Ruta para procesar el formulario del programa Wuepy Apoya (UGC)
// (siteController.enviarPostulacionApoya debe retornar JSON también, lo haremos en el próximo paso)
router.post('/programs/apoya', siteController.enviarPostulacionApoya);

module.exports = router;