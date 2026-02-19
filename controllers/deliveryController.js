// UBICACIÓN: lfaftech.com/controllers/deliveryController.js

const AgentDelivery = require('../models/AgentDelivery');
const AgentOrder = require('../models/AgentOrder');
const Agent = require('../models/Agent');
const { enviarMensajeDesdeAgente } = require('../services/agentWhatsappService');

// --- HELPERS (Utilidades para limpiar números) ---

// Convierte cualquier cosa en formato 5959...
const limpiarNumero = (num) => {
    if (!num) return '';
    let limpio = num.toString().replace(/\D/g, ''); 
    if (limpio.startsWith('09')) return '595' + limpio.substring(1);
    if (limpio.startsWith('9') && limpio.length === 9) return '595' + limpio;
    return limpio;
};

// Convierte para mostrar visualmente (0981...)
const limpiarNumeroVisual = (num) => {
    if (!num) return '';
    let str = num.toString().replace(/\D/g, '');
    if (str.startsWith('595')) return '0' + str.substring(3);
    return str;
};

// --- CONTROLADORES ---

// 1. OBTENER MIS REPARTIDORES
exports.getMyDeliveries = async (req, res) => {
    try {
        // Asumimos que req.user._id viene del middleware de autenticación
        const deliveries = await AgentDelivery.find({ owner: req.user._id });
        res.json(deliveries);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error obteniendo repartidores' });
    }
};

// 2. CREAR UN NUEVO REPARTIDOR
exports.createDelivery = async (req, res) => {
    try {
        const { name, phone, alias } = req.body;
        
        if (!name || !phone) {
            return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
        }

        const phoneClean = limpiarNumero(phone);

        const newDelivery = new AgentDelivery({
            owner: req.user._id,
            name,
            phone: phoneClean,
            alias: alias || name,
            status: 'AVAILABLE'
        });

        await newDelivery.save();
        res.json({ message: 'Repartidor creado exitosamente', delivery: newDelivery });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creando repartidor' });
    }
};

// 3. 🚀 ASIGNAR PEDIDO (EL CORAZÓN DE LA LOGÍSTICA)
exports.assignOrderToDelivery = async (req, res) => {
    try {
        const { orderId, deliveryId } = req.body;

        // A. Validaciones de Seguridad
        const order = await AgentOrder.findOne({ _id: orderId, owner: req.user._id });
        const delivery = await AgentDelivery.findOne({ _id: deliveryId, owner: req.user._id });

        if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
        if (!delivery) return res.status(404).json({ error: 'Repartidor no encontrado' });

        // B. Cálculos Financieros
        const total = order.orderDetails.totalAmount || 0;
        const costoEnvio = order.delivery.deliveryFee || 0; 
        const aRendir = total - costoEnvio; // Lo que el delivery te devuelve a ti

        // C. Formateo de Datos para Mensajes
        const clienteNombre = order.customerName;
        const clienteCelular = order.customerPhone;
        const visualCliente = limpiarNumeroVisual(clienteCelular);
        
        // Dirección: Unimos ciudad + dirección + referencia
        const direccionCompleta = `${order.delivery.city || ''} - ${order.delivery.address || ''}`;
        
        // Link de WhatsApp directo para el delivery
        const linkWsp = `https://wa.me/${limpiarNumero(clienteCelular)}`;

        // D. CONSTRUCCIÓN DE LA FICHA (Plantilla KingsStore)
        let ficha = `🛵 *NUEVO SERVICIO ASIGNADO*
    
👤 *Cliente:* ${clienteNombre}
📞 *Llamar:* ${visualCliente}
🔗 *Wsp:* ${linkWsp}

📍 *Ubicación:* ${order.delivery.city || 'Asunción'}
📝 *Dir:* ${order.delivery.address || 'Ver ubicación'}
📦 *Llevas:* ${order.orderDetails.summary || 'Paquete'}

💰 *COBRAS:* Gs. ${total.toLocaleString('es-PY')}
📉 *RINDES:* Gs. ${aRendir.toLocaleString('es-PY')}
✅ *GANAS:* Gs. ${costoEnvio.toLocaleString('es-PY')}`;

        if(order.delivery.googleMapsLink) {
            ficha += `\n📍 *MAPS:* ${order.delivery.googleMapsLink}`;
        }
        
        if(order.orderDetails.notes) {
            ficha += `\n⚠️ *OJO:* ${order.orderDetails.notes}`;
        }

        // E. MENSAJE PARA EL CLIENTE (Aviso de cortesía)
        const avisoCliente = `🛵 *¡Tu pedido está en camino!*

Hola ${clienteNombre}, tu pedido ya salió del depósito.
👤 *Repartidor:* ${delivery.name}
📞 *Cel:* ${limpiarNumeroVisual(delivery.phone)}

En breve se pondrá en contacto contigo para la entrega. 
¡Gracias por tu compra!`;

        // F. ENVÍO DE MENSAJES (Usando la nueva función del Paso 3)
        // Usamos el agente asignado al pedido para enviar los mensajes
        const agentId = order.agent;

        console.log(`📤 Enviando ficha a Delivery ${delivery.name}...`);
        
        // 1. Enviar al Delivery (Prioridad Alta)
        const enviadoDelivery = await enviarMensajeDesdeAgente(agentId, delivery.phone, ficha);
        
        if (!enviadoDelivery) {
            return res.status(500).json({ error: 'No se pudo enviar la ficha al delivery. Verifica que el Bot esté conectado.' });
        }

        // 2. Avisar al Cliente (Prioridad Media)
        await enviarMensajeDesdeAgente(agentId, clienteCelular, avisoCliente);

        // G. ACTUALIZACIÓN DE ESTADOS EN BASE DE DATOS
        order.status = 'ON_WAY'; // En camino
        order.delivery.assignedTo = delivery._id;
        order.delivery.assignedAt = new Date();
        
        await order.save();

        // Actualizar estadísticas del delivery
        await AgentDelivery.findByIdAndUpdate(deliveryId, {
            $inc: { 'stats.totalOrdersDelivered': 1 },
            status: 'BUSY' // Lo ponemos ocupado
        });

        res.json({ 
            message: 'Asignado y notificado correctamente',
            newState: 'ON_WAY'
        });

    } catch (error) {
        console.error("❌ Error asignando pedido:", error);
        res.status(500).json({ error: error.message });
    }
};

// 4. CAMBIAR ESTADO MANUAL (Opcional, para marcar como ENTREGADO)
exports.updateDeliveryStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const order = await AgentOrder.findOne({ _id: orderId, owner: req.user._id });
        
        if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

        order.status = status; // Ej: DELIVERED, CANCELLED
        if (status === 'DELIVERED') {
            order.deliveredAt = new Date();
            // Liberar al delivery
            if (order.delivery.assignedTo) {
                await AgentDelivery.findByIdAndUpdate(order.delivery.assignedTo, { status: 'AVAILABLE' });
            }
        }
        await order.save();
        res.json({ message: 'Estado actualizado' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};