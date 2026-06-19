// ==========================================================================
// WUEPY.COM - CONTROLADOR DEL PUNTO DE VENTA (API REST)
// ==========================================================================
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Site = require('../models/Site');

module.exports = {

    // ==========================================
    // 1. ENVIAR DATOS INICIALES DE LA TERMINAL OMNICANAL
    // ==========================================
    renderPosScreen: async (req, res) => {
        try {
            // El siteId puede venir de params o del usuario logueado según la estructura final de rutas
            const siteId = req.params.siteId || req.user.siteId;
            const site = await Site.findOne({ _id: siteId });
            
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada o acceso denegado.' });

            // Enviamos los productos activos al frontend/Flutter para el buscador rápido / grilla
            const products = await Product.find({ site: siteId, isActive: true })
                                          .select('name sku price compareAtPrice imageUrl stock')
                                          .sort({ name: 1 })
                                          .lean();

            // Enviamos la lista de empleados que son 'delivery' para el select del formulario de envíos
            const deliveryBoys = (site.employees || []).filter(emp => emp.role === 'delivery' && emp.isActive);

            return res.status(200).json({ 
                success: true,
                title: `Punto de Venta - ${site.name}`,
                site: {
                    id: site._id,
                    name: site.name,
                    currency: site.currency || 'PYG'
                },
                products,
                deliveryBoys 
            });
        } catch (err) {
            console.error('Error cargando los datos del POS:', err);
            return res.status(500).json({ success: false, message: 'Error interno del servidor al cargar la terminal.' });
        }
    },

    // ==========================================
    // 2. API: ESCANEAR CÓDIGO DE BARRAS (Buscador ultrarrápido)
    // ==========================================
    scanBarcode: async (req, res) => {
        const { code } = req.query;
        const siteId = req.params.siteId || req.user.siteId;

        if (!code) return res.status(400).json({ success: false, message: 'Código de barras no proporcionado.' });

        try {
            const product = await Product.findOne({ 
                site: siteId, 
                sku: code,
                isActive: true
            }).lean();

            if (!product) {
                return res.status(404).json({ success: false, message: 'Producto no encontrado o inactivo.' });
            }
            
            return res.status(200).json({ success: true, product });
        } catch (err) {
            console.error('Error escaneando código de barras:', err);
            return res.status(500).json({ success: false, message: 'Error interno de búsqueda.' });
        }
    },

    // ==========================================
    // 3. PROCESAR VENTA (El núcleo transaccional y logístico)
    // ==========================================
    processSale: async (req, res) => {
        const siteId = req.params.siteId || req.user.siteId;
        const { 
            cart, paymentMethod, discount, deliveryFee, 
            customerName, customerPhone, customerDocument,
            saleChannel, requiresDelivery, deliveryAddress, 
            deliveryRef, deliveryLat, deliveryLng, assignedDeliveryId,
            amountToCollect, changeFor
        } = req.body;

        // Validaciones básicas: Soporte por si Flutter o React envían string o array puro
        let cartData = typeof cart === 'string' ? JSON.parse(cart) : cart;

        if (!cartData || cartData.length === 0) {
            return res.status(400).json({ success: false, message: 'El carrito de compras está vacío.' });
        }

        try {
            const site = await Site.findById(siteId);
            if (!site) return res.status(403).json({ success: false, message: 'Tienda no válida o sin permisos.' });

            const saleItems = [];
            let calculatedSubtotal = 0;
            
            // Iterar sobre el carrito para verificar stock real en la BD y armar la orden
            for (let item of cartData) {
                // Si es un producto libre agregado a mano en el POS (Ej: "Servicio Extra")
                if (item.isCustom) {
                    saleItems.push({
                        productId: null,
                        name: item.name,
                        price: parseFloat(item.price),
                        quantity: parseInt(item.quantity),
                        isCustom: true
                    });
                    calculatedSubtotal += (item.price * item.quantity);
                    continue;
                }

                // Si es un producto del inventario real
                const product = await Product.findById(item.productId || item._id);
                if (!product) continue; 
                
                // Verificar Stock estricto
                if (product.stock < item.quantity) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Stock insuficiente para: ${product.name}. Solo quedan ${product.stock} unidades.` 
                    });
                }

                // Descontar Stock de la base de datos
                product.stock -= item.quantity;
                await product.save();

                saleItems.push({
                    productId: product._id,
                    name: product.name,
                    sku: product.sku || '',
                    price: product.price, // Obligamos a usar el precio de la BD por seguridad antifraude
                    quantity: item.quantity,
                    isCustom: false
                });

                calculatedSubtotal += (product.price * item.quantity);
            }

            const finalTotal = (calculatedSubtotal + parseFloat(deliveryFee || 0)) - parseFloat(discount || 0);
            const isDelivery = requiresDelivery === 'on' || requiresDelivery === true || requiresDelivery === 'true';

            // Crear el registro maestro de la venta
            const newSale = new Sale({
                site: siteId,
                registeredBy: req.user._id,
                saleChannel: saleChannel || 'pos', // Puede ser 'whatsapp' o 'web' si se integra luego
                
                customer: {
                    name: customerName || 'Cliente Ocasional',
                    phone: customerPhone || '',
                    documentId: customerDocument || ''
                },
                
                items: saleItems,
                
                subtotal: calculatedSubtotal,
                discount: parseFloat(discount || 0),
                deliveryFee: parseFloat(deliveryFee || 0),
                totalAmount: finalTotal,
                
                paymentMethod: paymentMethod || 'efectivo',
                paymentStatus: paymentMethod === 'efectivo' && !isDelivery ? 'paid' : 'pending',
                
                amountToCollect: parseFloat(amountToCollect || 0),
                changeFor: parseFloat(changeFor || 0),

                requiresDelivery: isDelivery,
                status: isDelivery ? 'in_transit' : 'completed' // in_transit va directo a la app del repartidor
            });

            // Si requiere delivery, agregamos los datos logísticos precisos
            if (isDelivery) {
                newSale.delivery = {
                    address: deliveryAddress || '',
                    reference: deliveryRef || '',
                    assignedTo: assignedDeliveryId || null,
                    coordinates: {
                        lat: deliveryLat || null,
                        lng: deliveryLng || null
                    }
                };
            }

            await newSale.save();

            return res.status(201).json({ 
                success: true, 
                saleId: newSale._id, 
                totalCharged: finalTotal,
                message: isDelivery ? '¡Pedido guardado y enviado a logística!' : '¡Venta completada y stock descontado con éxito!' 
            });

        } catch (err) {
            console.error('Error crítico procesando la venta:', err);
            return res.status(500).json({ success: false, message: 'Error interno en los servidores al procesar la venta.' });
        }
    },

    // ==========================================
    // 4. HISTORIAL Y REPORTES DEL POS (API)
    // ==========================================
    getSalesHistory: async (req, res) => {
        try {
            const siteId = req.params.siteId || req.user.siteId;
            const site = await Site.findOne({ _id: siteId });
            
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no válida.' });

            // Traemos las últimas 100 ventas, incluyendo el nombre del empleado que registró y el delivery asignado
            const sales = await Sale.find({ site: siteId })
                                    .populate('registeredBy', 'name')
                                    .populate('delivery.assignedTo', 'name')
                                    .sort({ createdAt: -1 })
                                    .limit(100)
                                    .lean();

            return res.status(200).json({ 
                success: true,
                title: `Historial de Ventas - ${site.name}`,
                sales 
            });
        } catch (err) {
            console.error('Error cargando historial de la API:', err);
            return res.status(500).json({ success: false, message: 'Fallo al extraer el historial de ventas.' });
        }
    }
};