// routes/agents.js COMPLETO Y CORREGIDO
const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Agent = require('../models/Agent');
const AgentOrder = require('../models/AgentOrder');
const { iniciarBotAgente, cerrarSesionAgente, sessions } = require('../services/agentWhatsappService');

/**
 * --- RUTAS DE GESTIÓN DE AGENTES IA ---
 * Corrección: Auto-creación de agente para evitar errores 404 en usuarios nuevos.
 */

// FUNCIÓN AUXILIAR: BUSCAR O CREAR AGENTE
async function getOrCreateAgent(userId) {
    let agent = await Agent.findOne({ user: userId });
    
    if (!agent) {
        console.log(`ℹ️ Creando agente automático para usuario ${userId}`);
        agent = new Agent({
            user: userId,
            botName: 'Mi Asistente IA',
            aiConfig: { personality: 'amigable' },
            wizard: { qrCode: '' } // Inicializamos campo QR
        });
        await agent.save();
    }
    return agent;
}

// 1. OBTENER CONFIGURACIÓN (Vista Config)
router.get('/my-agent', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await getOrCreateAgent(req.user._id);
        const isLive = sessions.has(agent._id.toString());
        
        res.json({ ok: true, agent, isLive });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al obtener agente' });
    }
});

// 2. WIZARD: GUARDAR PASOS
router.post('/wizard/step/:step', ensureAuthenticated, async (req, res) => {
    try {
        const step = parseInt(req.params.step);
        const agent = await getOrCreateAgent(req.user._id); // Usamos la función segura
        const data = req.body;

        switch (step) {
            case 1: // IDENTIDAD
                agent.botName = data.botName || agent.botName;
                agent.description = data.description || agent.description;
                agent.wizard.step1Completed = true;
                break;
            
            case 2: // CONFIGURACIÓN IA
                agent.aiConfig.personality = data.personality || agent.aiConfig.personality;
                agent.aiConfig.tone = data.tone || agent.aiConfig.tone;
                agent.aiConfig.customInstructions = data.customInstructions || agent.aiConfig.customInstructions;
                agent.aiConfig.usePlatformKey = data.usePlatformKey !== undefined ? data.usePlatformKey : true;
                if (data.geminiApiKey) agent.aiConfig.geminiApiKey = data.geminiApiKey;
                agent.wizard.step2Completed = true;
                break;

            case 3: // LOGÍSTICA
                agent.businessConfig.shippingCost = data.shippingCost || 0;
                agent.businessConfig.shippingRegions = data.shippingRegions || [];
                agent.businessConfig.openingHours = data.openingHours || agent.businessConfig.openingHours;
                agent.wizard.step3Completed = true;
                break;

            case 4: // PAGOS
                agent.paymentConfig.bankInfo = data.bankInfo || agent.paymentConfig.bankInfo;
                agent.paymentConfig.requirePaymentProof = data.requirePaymentProof || false;
                agent.wizard.step4Completed = true;
                agent.wizard.isFullyConfigured = true;
                break;
        }

        await agent.save();
        res.json({ ok: true, agent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error guardando configuración' });
    }
});

// 3. ESTADO DE WHATSAPP (QR Y CONEXIÓN)
router.get('/connection-status', ensureAuthenticated, async (req, res) => {
    try {
        // AQUÍ ESTABA EL ERROR: Si no existía, devolvía 404. Ahora lo crea.
        const agent = await getOrCreateAgent(req.user._id);

        res.json({
            status: agent.sessionStatus || 'disconnected',
            qr: (agent.sessionStatus === 'qr_ready') ? agent.wizard.qrCode : null,
            isActive: agent.isActive
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false });
    }
});

// 4. INICIAR BOT
router.post('/start-bot', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await getOrCreateAgent(req.user._id);

        // Llamamos al servicio de WhatsApp
        iniciarBotAgente(agent._id);
        
        // Marcamos como activo en BD
        await Agent.findByIdAndUpdate(agent._id, { isActive: true });
        
        res.json({ ok: true, msg: 'Iniciando servicio...' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error interno al iniciar bot' });
    }
});

// 5. CERRAR SESIÓN
router.post('/logout-bot', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        if (agent) {
            await cerrarSesionAgente(agent._id);
            // Actualizamos estado en BD para que el polling de la web se entere
            agent.sessionStatus = 'disconnected';
            agent.wizard.qrCode = '';
            agent.isActive = false;
            await agent.save();
        }
        res.json({ ok: true, msg: 'Sesión cerrada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al cerrar sesión' });
    }
});

// 6. ESTADÍSTICAS
router.get('/dashboard-stats', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await getOrCreateAgent(req.user._id);

        const totalOrders = await AgentOrder.countDocuments({ agent: agent._id });
        const newOrders = await AgentOrder.countDocuments({ agent: agent._id, status: 'PEDIDO_CONFIRMADO' });
        const entregados = await AgentOrder.countDocuments({ agent: agent._id, status: 'ENTREGADO' });
        
        const ventasResult = await AgentOrder.aggregate([
            { $match: { agent: agent._id, status: 'ENTREGADO' } },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);

        res.json({
            totalOrders,
            newOrders,
            entregados,
            totalRevenue: ventasResult.length > 0 ? ventasResult[0].total : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false });
    }
});

module.exports = router;