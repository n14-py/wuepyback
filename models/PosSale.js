// UBICACIÓN: lfaftech.com/models/PosSale.js

const mongoose = require('mongoose');

const PosSaleSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Cliente (Opcional, para ventas anónimas o clientes registrados)
    clientName: {
        type: String,
        default: 'Cliente General'
    },
    // Detalle de la Venta (Array de productos)
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PosProduct' // Referencia al modelo que creamos antes
        },
        productName: { type: String, required: true }, // Guardamos nombre por si se borra el producto original
        quantity: { 
            type: Number, 
            required: true,
            min: 0.001 // Permite decimales para gramos/kilos
        },
        unitPrice: { type: Number, required: true },
        subtotal: { type: Number, required: true }
    }],
    // Totales Financieros
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    // Información de Pago
    paymentMethod: {
        type: String,
        enum: ['EFECTIVO', 'TARJETA', 'QR', 'TRANSFERENCIA', 'OTRO'],
        default: 'EFECTIVO'
    },
    status: {
        type: String,
        enum: ['COMPLETADA', 'CANCELADA', 'PENDIENTE'],
        default: 'COMPLETADA'
    },
    // Metadatos de Auditoría
    date: {
        type: Date,
        default: Date.now,
        index: true // Indexado para reportes rápidos por fecha
    },
    receiptNumber: {
        type: String, // Generaremos un ID único corto tipo #A1029
        unique: true
    }
});

// --- MIDDLEWARE ---

// Generar número de recibo único antes de guardar
PosSaleSchema.pre('save', async function(next) {
    if (!this.receiptNumber) {
        // Genera un string aleatorio de 8 caracteres (ej: A1B2-C3D4)
        const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
        this.receiptNumber = `REC-${uniqueId}`;
    }
    next();
});

module.exports = mongoose.model('PosSale', PosSaleSchema);