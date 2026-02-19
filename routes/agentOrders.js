// routes/agentOrders.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ensureAuthenticated } = require('../middleware/auth');
const Agent = require('../models/Agent');
const AgentOrder = require('../models/AgentOrder');
const AgentDelivery = require('../models/AgentDelivery');
const { enviarMensajeAgente } = require('../services/agentWhatsappService');
const { subirImagenBuffer } = require('../utils/bunnyStorage');

// Configuración de Multer para comprobantes de envío
const upload = multer({ storage: multer.memoryStorage() });

/**
 * --- GESTIÓN DE PEDIDOS (CRM DE VENTAS) ---
 * Aquí el usuario ve los pedidos capturados por la IA y coordina la logística.
 */

// 1. OBTENER TODOS LOS PEDIDOS DEL AGENTE (Con filtros opcionales)
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        if (!agent) return res.status(404).json({ msg: 'Agente no encontrado.' });

        const { status } = req.query;
        let query = { agent: agent._id };
        if (status) query.status = status;

        const pedidos = await AgentOrder.find(query)
            .populate('assignedDriver') // Traemos los datos del repartidor si tiene
            .sort({ lastInteraction: -1 });

        res.json({ ok: true, pedidos });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al obtener pedidos.' });
    }
});

// 2. ACTUALIZAR ESTADO DEL PEDIDO (Con Notificación Automática)
router.put('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        const pedido = await AgentOrder.findOne({ _id: req.params.id, agent: agent._id });

        if (!pedido) return res.status(404).json({ msg: 'Pedido no encontrado.' });

        const oldStatus = pedido.status;
        const { status, customerName, city, address, totalAmount, paymentStatus } = req.body;

        // Actualizamos datos básicos
        pedido.status = status || pedido.status;
        pedido.customerName = customerName || pedido.customerName;
        pedido.city = city || pedido.city;
        pedido.address = address || pedido.address;
        pedido.totalAmount = totalAmount || pedido.totalAmount;
        pedido.paymentStatus = paymentStatus || pedido.paymentStatus;

        await pedido.save();

        // --- LÓGICA DE NOTIFICACIONES (BALAS DE PLATA) ---
        // Solo enviamos si el estado CAMBIÓ y el bot está conectado
        if (status && status !== oldStatus) {
            let mensajeNotificacion = '';

            if (status === 'PEDIDO_CONFIRMADO') {
                mensajeNotificacion = `✅ *¡Buenas noticias, ${pedido.customerName}!* Tu pedido ha sido confirmado y está siendo preparado para el envío. ✨`;
            } else if (status === 'EN_CAMINO') {
                mensajeNotificacion = `🛵 *¡Pedido en camino!* Tu paquete ya salió con nuestro repartidor. ¡Atento/a a tu celular! 🙌`;
            } else if (status === 'ENTREGADO') {
                mensajeNotificacion = `🎉 *¡Pedido Entregado!* Muchas gracias por tu compra. Esperamos que disfrutes tu producto. ❤️`;
            }

            if (mensajeNotificacion) {
                await enviarMensajeAgente(agent._id, pedido.customerPhone, mensajeNotificacion);
            }
        }

        res.json({ ok: true, pedido });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al actualizar.' });
    }
});

// 3. ASIGNAR REPARTIDOR (Doble Notificación: Al Repartidor y al Cliente)
router.post('/:id/assign-driver', ensureAuthenticated, async (req, res) => {
    try {
        const { driverId } = req.body;
        const agent = await Agent.findOne({ user: req.user._id });
        const pedido = await AgentOrder.findOne({ _id: req.params.id, agent: agent._id });
        const driver = await AgentDelivery.findOne({ _id: driverId, agent: agent._id });

        if (!pedido || !driver) return res.status(404).json({ msg: 'Pedido o Repartidor no encontrado.' });

        pedido.assignedDriver = driver._id;
        pedido.status = 'EN_CAMINO';
        await pedido.save();

        // A. Notificar al REPARTIDOR (La Ficha de Servicio)
        const fichaRepartidor = `
📋 *NUEVA ENTREGA ASIGNADA*
--------------------------------
👤 *Cliente:* ${pedido.customerName}
📞 *Tel:* ${pedido.customerPhone}
📍 *Ciudad:* ${pedido.city}
🏠 *Dirección:* ${pedido.address}
💰 *A Cobrar:* Gs. ${pedido.totalAmount.toLocaleString('es-PY')}
--------------------------------
🚀 _¡Buen viaje!_
        `;
        await enviarMensajeAgente(agent._id, driver.phone, fichaRepartidor);

        // B. Notificar al CLIENTE (Aviso de Repartidor)
        const avisoCliente = `🛵 *Hola ${pedido.customerName}!* Te informamos que el repartidor *${driver.name}* ya tiene tu pedido y va en camino.`;
        await enviarMensajeAgente(agent._id, pedido.customerPhone, avisoCliente);

        res.json({ ok: true, msg: 'Repartidor asignado y notificado.' });
    } catch (error) {
        res.status(500).json({ ok: false });
    }
});

// 4. SUBIR COMPROBANTE DE ENCOMIENDA (Y avisar al cliente con foto)
router.post('/:id/shipping-proof', ensureAuthenticated, upload.single('comprobante'), async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        const pedido = await AgentOrder.findOne({ _id: req.params.id, agent: agent._id });

        if (!pedido || !req.file) return res.status(404).json({ msg: 'Faltan datos.' });

        // Subimos la foto de la guía a BunnyCDN
        const urlFoto = await subirImagenBuffer(req.file.buffer);
        pedido.proofOfPaymentUrl = urlFoto; // Reutilizamos el campo o podrías crear uno nuevo 'shippingProofUrl'
        pedido.status = 'EN_CAMINO';
        await pedido.save();

        // Notificar al cliente con el enlace de la foto
        const mensajeEncomienda = `🚛 *¡Tu pedido ya fue despachado!* Aquí tienes la foto de tu comprobante de envío: ${urlFoto}
¡En breve te llegará a tu ciudad! 🙌`;
        
        await enviarMensajeAgente(agent._id, pedido.customerPhone, mensajeEncomienda);

        res.json({ ok: true, url: urlFoto });
    } catch (error) {
        res.status(500).json({ ok: false });
    }
});

// 5. OBTENER UN PEDIDO ESPECÍFICO (Detalles del chat)
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        const pedido = await AgentOrder.findOne({ _id: req.params.id, agent: agent._id }).populate('assignedDriver');
        
        if (!pedido) return res.status(404).json({ msg: 'No encontrado.' });
        res.json({ ok: true, pedido });
    } catch (error) {
        res.status(500).json({ ok: false });
    }
});

// 6. ELIMINAR PEDIDO
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        await AgentOrder.deleteOne({ _id: req.params.id, agent: agent._id });
        res.json({ ok: true, msg: 'Registro eliminado.' });
    } catch (error) {
        res.status(500).json({ ok: false });
    }
});

module.exports = router;