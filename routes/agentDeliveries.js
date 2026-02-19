// routes/agentDeliveries.js
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Agent = require('../models/Agent');
const AgentDelivery = require('../models/AgentDelivery');
const AgentOrder = require('../models/AgentOrder');

/**
 * --- GESTIÓN DE REPARTIDORES (LOGÍSTICA) ---
 * Este módulo permite al dueño de la tienda gestionar su flota privada.
 * Los repartidores registrados aquí recibirán las fichas de entrega por WhatsApp.
 */

// 1. LISTAR TODOS LOS REPARTIDORES DEL AGENTE
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        // 1. Identificar al Agente (Tienda) del usuario actual
        const agent = await Agent.findOne({ user: req.user._id });
        if (!agent) return res.status(404).json({ msg: 'Agente no configurado.' });

        // 2. Buscar repartidores vinculados a esta tienda
        // Incluimos cuántos pedidos activos tiene cada uno
        const repartidores = await AgentDelivery.find({ agent: agent._id }).sort({ active: -1, name: 1 });

        res.json({ ok: true, repartidores });
    } catch (error) {
        console.error("Error listando repartidores:", error);
        res.status(500).json({ ok: false, msg: 'Error del servidor al cargar flota.' });
    }
});

// 2. REGISTRAR NUEVO REPARTIDOR
router.post('/', ensureAuthenticated, async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        // Validación básica
        if (!name || !phone) {
            return res.status(400).json({ msg: 'Nombre y Teléfono son obligatorios.' });
        }

        const agent = await Agent.findOne({ user: req.user._id });
        if (!agent) return res.status(404).json({ msg: 'Error de identidad de agente.' });

        // Limpieza de número telefónico (Eliminar espacios, guiones, paréntesis)
        // Esto es CRÍTICO para que el bot de WhatsApp pueda enviar mensajes.
        const cleanPhone = phone.replace(/\D/g, ''); 

        // Verificar duplicados DENTRO DE ESTA TIENDA (No importa si existe en otra)
        const existe = await AgentDelivery.findOne({ 
            agent: agent._id, 
            phone: cleanPhone 
        });
        
        if (existe) {
            return res.status(400).json({ msg: 'Ya tienes un repartidor con ese número.' });
        }

        const nuevoRepartidor = new AgentDelivery({
            agent: agent._id,
            name: name.trim(),
            phone: cleanPhone,
            active: true,
            currentOrders: []
        });

        await nuevoRepartidor.save();
        res.json({ ok: true, repartidor: nuevoRepartidor, msg: 'Repartidor añadido al equipo.' });

    } catch (error) {
        console.error("Error creando repartidor:", error);
        res.status(500).json({ ok: false, msg: 'No se pudo guardar el repartidor.' });
    }
});

// 3. EDITAR DATOS DE UN REPARTIDOR
router.put('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { name, phone, active } = req.body;
        const agent = await Agent.findOne({ user: req.user._id });

        // Buscamos el repartidor asegurando que pertenezca a este agente
        const repartidor = await AgentDelivery.findOne({ 
            _id: req.params.id, 
            agent: agent._id 
        });

        if (!repartidor) return res.status(404).json({ msg: 'Repartidor no encontrado.' });

        // Actualizamos campos
        if (name) repartidor.name = name.trim();
        if (phone) repartidor.phone = phone.replace(/\D/g, ''); // Limpiar siempre
        
        // Estado Activo/Inactivo (Para que no aparezca en la lista de asignación si está de franco)
        if (active !== undefined) repartidor.active = active;

        await repartidor.save();
        res.json({ ok: true, repartidor, msg: 'Datos actualizados.' });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al actualizar.' });
    }
});

// 4. ELIMINAR REPARTIDOR (Con verificación de seguridad)
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        const repartidor = await AgentDelivery.findOne({ 
            _id: req.params.id, 
            agent: agent._id 
        });

        if (!repartidor) return res.status(404).json({ msg: 'Repartidor no encontrado.' });

        // Verificar si tiene pedidos pendientes
        const pedidosPendientes = await AgentOrder.countDocuments({ 
            assignedDriver: repartidor._id, 
            status: { $in: ['EN_CAMINO', 'PEDIDO_CONFIRMADO'] } 
        });

        if (pedidosPendientes > 0) {
            return res.status(400).json({ 
                msg: `No puedes eliminar a ${repartidor.name} porque tiene ${pedidosPendientes} pedidos activos asignados. Reasígnalos primero.` 
            });
        }

        await AgentDelivery.deleteOne({ _id: repartidor._id });
        res.json({ ok: true, msg: 'Repartidor eliminado correctamente.' });

    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al eliminar.' });
    }
});

// 5. OBTENER DETALLE (Para métricas individuales - Futuro)
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        const repartidor = await AgentDelivery.findOne({ _id: req.params.id, agent: agent._id });
        
        if (!repartidor) return res.status(404).json({ msg: 'No encontrado.' });

        // Opcional: Cargar historial de entregas de este chofer
        const historialEntregas = await AgentOrder.find({
            assignedDriver: repartidor._id,
            status: 'ENTREGADO'
        }).limit(20).sort({ lastInteraction: -1 });

        res.json({ 
            ok: true, 
            repartidor,
            entregasRecientes: historialEntregas
        });

    } catch (error) {
        res.status(500).json({ ok: false });
    }
});

module.exports = router;