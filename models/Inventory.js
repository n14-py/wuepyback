const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    cost: { type: Number, default: 0 }, // Para que el usuario sepa su ganancia
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 }, // ¡Alerta de stock bajo!
    
    sku: { type: String }, // Código único
    category: { type: String, default: 'General' },
    
    images: [{ type: String }], // URLs de Bunny.net
    
    status: { type: String, enum: ['disponible', 'agotado', 'oculto'], default: 'disponible' },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inventory', InventorySchema);