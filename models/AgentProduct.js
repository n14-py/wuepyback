const mongoose = require('mongoose');

const AgentProductSchema = new mongoose.Schema({
    // --- VINCULACIÓN AL AGENTE (CRÍTICO PARA INDEPENDENCIA) ---
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true,
        index: true // Indexado para búsquedas rápidas
    },

    // --- DATOS DEL PRODUCTO ---
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true
    },
    description: { // Descripción visible en web/catálogo
        type: String,
        default: ''
    },
    aiDescription: { // "Chuletar" para que la IA sepa venderlo
        type: String,
        default: 'Producto de alta calidad recomendado.'
    },
    imageUrl: {
        type: String,
        default: '' // URL de Cloudinary o BunnyCDN
    },
    category: {
        type: String,
        default: 'General'
    },

    // --- ESTADO ---
    stock: {
        type: Number,
        default: 100 // Stock simple
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AgentProduct', AgentProductSchema);