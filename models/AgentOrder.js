const mongoose = require('mongoose');

const AgentOrderSchema = new mongoose.Schema({
    // --- DUEÑO DE LA DATA ---
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true
    },

    // --- IDENTIDAD DEL CLIENTE ---
    customerPhone: { // ID único del cliente (WhatsApp ID)
        type: String,
        required: true
    },
    customerName: {
        type: String,
        default: 'Nuevo Cliente'
    },

    // --- DATOS DE ENTREGA ---
    city: { type: String, default: '' },
    address: { type: String, default: '' }, // Barrio + Ref
    gpsLocation: { type: String, default: '' }, // Coordenadas si envía ubicación
    
    // --- DETALLES DEL PEDIDO ---
    interestedProduct: { type: String, default: '' }, // Lo que la IA detectó
    totalAmount: { type: Number, default: 0 },
    deliveryCost: { type: Number, default: 0 },
    
    paymentStatus: {
        type: String,
        enum: ['PENDIENTE', 'PAGADO', 'CONTRAENTREGA'],
        default: 'PENDIENTE'
    },
    proofOfPaymentUrl: { type: String, default: '' }, // Foto del comprobante

    // --- ESTADO DEL FLUJO (PIPELINE) ---
    status: {
        type: String,
        enum: [
            'NUEVO',             // Recién saludó
            'COTIZANDO',         // IA está vendiendo
            'ESPERANDO_DATOS',   // IA pidió nombre/dirección
            'PEDIDO_CONFIRMADO', // IA cerró la venta
            'EN_CAMINO',         // Asignado a Delivery
            'ENTREGADO', 
            'CANCELADO'
        ],
        default: 'NUEVO'
    },

    // --- LOGÍSTICA ---
    assignedDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AgentDelivery', // Referencia al repartidor de ESTE agente
        default: null
    },
    deliveryMethod: {
        type: String,
        enum: ['DELIVERY', 'ENCOMIENDA', 'RETIRO'],
        default: 'DELIVERY'
    },

    // --- CEREBRO (HISTORIAL CHAT) ---
    chatHistory: [
        {
            role: { type: String, enum: ['user', 'model', 'system'] }, // 'model' es Gemini
            content: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],

    lastInteraction: { type: Date, default: Date.now }
});

// Índice compuesto para buscar clientes únicos DENTRO de un agente
AgentOrderSchema.index({ agent: 1, customerPhone: 1 }, { unique: true });

module.exports = mongoose.model('AgentOrder', AgentOrderSchema);