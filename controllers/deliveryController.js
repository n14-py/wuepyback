// ==========================================================================
// WUEPY.COM - CONTROLADOR DE LOGÍSTICA / DELIVERY (API REST)
// ==========================================================================
const Sale = require('../models/Sale');
const Site = require('../models/Site');

const limpiarNumero = (num) => {
    if (!num) return '';
    let limpio = num.toString().replace(/\D/g, ''); 
    if (limpio.startsWith('09')) return '595' + limpio.substring(1);
    if (limpio.startsWith('9') && limpio.length === 9) return '595' + limpio;
    return limpio;
};

const limpiarNumeroVisual = (num) => {
    if (!num) return '';
    let str = num.toString().replace(/\D/g, '');
    if (str.startsWith('595')) return '0' + str.substring(3);
    return str;
};

module.exports = {
    // ==========================================
    // 1. OBTENER REPARTIDORES
    // ==========================================
    getMyDeliveries: async (req, res) => {
        try {
            const siteId = req.params.siteId || req.body.siteId || req.user.siteId;
            const site = await Site.findOne({ _id: siteId });
            
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

            const deliveries = (site.employees || []).filter(emp => emp.role === 'delivery' && emp.isActive);
            return res.status(200).json({ success: true, deliveries });
        } catch (error) {
            console.error('Error obteniendo repartidores:', error);
            return res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    },

    // ==========================================
    // 2. CREAR UN NUEVO REPARTIDOR
    // ==========================================
    createDelivery: async (req, res) => {
        try {
            const siteId = req.params.siteId || req.user.siteId;
            const { name, email, password, phone } = req.body;
            
            if (!name || !phone || !email || !password) {
                return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
            }

            const site = await Site.findOne({ _id: siteId });
            if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada' });

            const phoneClean = limpiarNumero(phone);

            site.employees.push({
                name,
                email: email.toLowerCase(),
                password, // En producción asegurate de encriptar esto si usan login propio
                role: 'delivery',
                phone: phoneClean,
                isActive: true
            });

            await site.save();
            const newDelivery = site.employees[site.employees.length - 1];
            
            return res.status(201).json({ success: true, message: 'Repartidor creado exitosamente', delivery: newDelivery });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error creando repartidor' });
        }
    },

    // ==========================================
    // 3. ASIGNAR PEDIDO (CORAZÓN LOGÍSTICO)
    // ==========================================
    assignOrderToDelivery: async (req, res) => {
        try {
            const siteId = req.params.siteId || req.user.siteId;
            const { orderId, deliveryId } = req.body;

            const sale = await Sale.findOne({ _id: orderId, site: siteId });
            const site = await Site.findOne({ _id: siteId });

            if (!sale) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
            if (!site) return res.status(403).json({ success: false, message: 'No tienes permiso sobre esta tienda' });

            const delivery = site.employees.id(deliveryId);
            if (!delivery || delivery.role !== 'delivery') {
                return res.status(404).json({ success: false, message: 'Repartidor no encontrado o rol inválido' });
            }

            const totalCobrar = sale.amountToCollect || sale.totalAmount; 
            const costoEnvio = sale.deliveryFee || 0; 
            const aRendir = totalCobrar - costoEnvio; 

            const clienteNombre = sale.customer.name;
            const clienteCelular = sale.customer.phone;
            const visualCliente = limpiarNumeroVisual(clienteCelular);
            const direccionCompleta = sale.delivery.address || 'Sin dirección especificada';
            const linkWsp = `https://wa.me/${limpiarNumero(clienteCelular)}`;

            const resumenItems = sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

            let ficha = `🛵 *NUEVO SERVICIO ASIGNADO*
    
👤 *Cliente:* ${clienteNombre}
📞 *Llamar:* ${visualCliente}
🔗 *Wsp:* ${linkWsp}

📍 *Dir:* ${direccionCompleta}
📦 *Llevas:* ${resumenItems}

💰 *COBRAS:* Gs. ${totalCobrar.toLocaleString('es-PY')}
📉 *RINDES:* Gs. ${aRendir.toLocaleString('es-PY')}
✅ *GANAS:* Gs. ${costoEnvio.toLocaleString('es-PY')}`;

            if(sale.delivery.coordinates && sale.delivery.coordinates.lat) {
                ficha += `\n📍 *MAPS:* https://maps.google.com/?q=$${sale.delivery.coordinates.lat},${sale.delivery.coordinates.lng}`;
            }
            if(sale.delivery.reference) {
                ficha += `\n⚠️ *REF:* ${sale.delivery.reference}`;
            }

            sale.status = 'in_transit'; 
            sale.delivery.assignedTo = delivery._id;
            await sale.save();

            return res.status(200).json({ 
                success: true,
                message: 'Pedido asignado con éxito.',
                newState: 'in_transit',
                whatsappFicha: ficha 
            });

        } catch (error) {
            console.error("❌ Error asignando pedido:", error);
            return res.status(500).json({ success: false, message: 'Error interno al asignar el pedido.' });
        }
    },

    // ==========================================
    // 4. CAMBIAR ESTADO MANUAL (MARCAR ENTREGADO)
    // ==========================================
    updateDeliveryStatus: async (req, res) => {
        try {
            const siteId = req.params.siteId || req.user.siteId;
            const { orderId, status } = req.body;
            
            const sale = await Sale.findOne({ _id: orderId, site: siteId });
            if (!sale) return res.status(404).json({ success: false, message: 'Pedido no encontrado' });

            const validStatuses = ['pending', 'preparing', 'ready_for_pickup', 'in_transit', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Estado de pedido inválido' });
            }

            sale.status = status;
            
            if (status === 'completed') {
                sale.delivery.deliveredAt = new Date();
                if (sale.paymentMethod === 'efectivo') {
                    sale.paymentStatus = 'paid';
                }
            }

            await sale.save();
            return res.status(200).json({ success: true, message: 'Estado actualizado', status: sale.status });

        } catch (error) {
            return res.status(500).json({ success: false, message: 'Error interno actualizando estado.' });
        }
    }
};