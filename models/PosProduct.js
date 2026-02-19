// UBICACIÓN: lfaftech.com/models/PosProduct.js

const mongoose = require('mongoose');

const PosProductSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Indexado para búsquedas rápidas por usuario
    },
    barcode: {
        type: String,
        trim: true,
        uppercase: true,
        default: '' // Puede estar vacío si es un producto manual (ej. "Servicio")
    },
    name: {
        type: String,
        required: [true, 'El nombre del producto es obligatorio'],
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    category: {
        type: String,
        trim: true,
        default: 'General'
    },
    // Precios y Costos (En Guaraníes - PYG)
    costPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    salePrice: {
        type: Number,
        required: [true, 'El precio de venta es obligatorio'],
        min: 0
    },
    // Gestión de Inventario
    stock: {
        type: Number,
        default: 0
    },
    minStock: {
        type: Number,
        default: 5,
        help: 'Alerta cuando el stock baje de este número'
    },
    // Configuración de Unidades (Clave para ventas por Kilo)
    unitType: {
        type: String,
        enum: ['UNIDAD', 'KG', 'LITRO', 'METRO'],
        default: 'UNIDAD'
    },
    isWeighted: {
        type: Boolean,
        default: false,
        help: 'Si es verdadero, permite ventas fraccionadas (ej: 0.500 kg)'
    },
    trackStock: {
        type: Boolean,
        default: true,
        help: 'Si es falso, es un servicio o producto infinito'
    },
    // Metadatos
    image: {
        type: String,
        default: '/img/pos/default-product.png'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// --- ÍNDICES ---
// Importante: El código de barras debe ser único, pero SOLO dentro del inventario de ESE usuario.
// Así, dos usuarios diferentes pueden vender "Coca Cola" con el mismo código sin conflicto.
PosProductSchema.index({ user: 1, barcode: 1 }, { 
    unique: true, 
    partialFilterExpression: { barcode: { $type: "string", $gt: "" } } 
});

// --- MÉTODOS VIRTUALES Y HELPERS ---

// Calcular ganancia bruta estimada
PosProductSchema.virtual('profitMargin').get(function() {
    if (this.salePrice && this.costPrice) {
        return this.salePrice - this.costPrice;
    }
    return 0;
});

// Middleware antes de guardar para actualizar 'updatedAt'
PosProductSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('PosProduct', PosProductSchema);