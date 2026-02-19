// UBICACIÓN: lfaftech.com/models/AgentInventory.js

const mongoose = require('mongoose');

const AgentInventorySchema = new mongoose.Schema({
    // 1. DUEÑO DEL PRODUCTO
    // Se vincula al usuario, NO a ningún sitio web.
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },

    // 2. VINCULACIÓN ESPECÍFICA (Opcional)
    // Si el usuario tiene 3 IAs distintas (Vendedor 1, Soporte 2, etc), 
    // puede asignar este producto solo a un Agente específico.
    agentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Agent',
        default: null // Si es null, está disponible para todos los agentes de este usuario
    },

    // 3. DATOS DEL PRODUCTO
    name: { 
        type: String, 
        required: true, 
        trim: true 
    },
    
    price: { 
        type: Number, 
        required: true, 
        min: 0 
    },

    // 4. EL CEREBRO DE LA VENTA (Lo más importante)
    // A diferencia de una web que necesita HTML bonito, la IA necesita CONTEXTO.
    // En este campo el usuario pone los "Tips de Venta" para que el bot los use.
    aiInstructions: { 
        type: String, 
        default: 'Producto de alta calidad. Recomendado para uso diario.',
        required: true
    },
    
    // Palabras clave para que la IA sepa cuándo ofrecerlo
    // Ej: ["zapatillas", "correr", "deporte"]
    keywords: [{ type: String }],

    // 5. MULTIMEDIA (Para WhatsApp)
    imageUrl: { type: String }, // URL de la imagen para enviar al cliente

    // 6. LOGÍSTICA
    stock: { type: Number, default: 0 },
    isService: { type: Boolean, default: false }, // Si es True, el stock es infinito
    isActive: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now }
});

// Índice de búsqueda rápida para que la IA encuentre productos en milisegundos
AgentInventorySchema.index({ owner: 1, name: 'text', aiInstructions: 'text' });

module.exports = mongoose.model('AgentInventory', AgentInventorySchema);