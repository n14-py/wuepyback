const mongoose = require('mongoose');

// ==========================================
// ESQUEMA DE ITEMS VENDIDOS (Snapshot del momento)
// ==========================================
const saleItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Puede ser nulo si es venta libre
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    variantName: { type: String, default: '' }, // Ej: "Color Rojo - Talla M"
    price: { type: Number, required: true }, // Precio al que se vendió en ese momento
    quantity: { type: Number, required: true, min: 1 },
    isCustom: { type: Boolean, default: false } // True si fue un producto agregado a mano en el POS
});

// ==========================================
// ESQUEMA DE VENTAS Y PEDIDOS (Omnicanal)
// ==========================================
const saleSchema = new mongoose.Schema({
    // --- RELACIONES PRINCIPALES ---
    site: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Site', 
        required: true,
        index: true
    },
    registeredBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' // Quién registró la venta (Cajero, Admin, o nulo si fue compra web)
    },
    
    // --- ORIGEN DE LA VENTA ---
    saleChannel: { 
        type: String, 
        enum: ['pos', 'web_store', 'wuepy_marketplace', 'whatsapp'], 
        default: 'pos' 
    },

    // --- DATOS DEL CLIENTE (Vital para envíos y CRM) ---
    customer: {
        name: { type: String, default: 'Cliente Ocasional' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        documentId: { type: String, default: '' } // RUC o Cédula para facturación
    },

    // --- DETALLE DE LA COMPRA ---
    items: [saleItemSchema],
    
    // --- FINANZAS Y TOTALES ---
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }, // subtotal - discount + deliveryFee
    
    // --- PAGOS ---
    paymentMethod: { 
        type: String, 
        enum: ['efectivo', 'tarjeta', 'transferencia', 'qr', 'pasarela_pendiente'], 
        default: 'efectivo' 
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded'],
        default: 'paid' // Asumimos pagado en POS, pero pendiente en Web/WhatsApp hasta confirmar
    },
    amountToCollect: { type: Number, default: 0 }, // ¿Cuánto debe cobrar el delivery en efectivo?
    changeFor: { type: Number, default: 0 }, // "Llevar vuelto para X guaraníes"

    // --- LOGÍSTICA Y DELIVERY ---
    requiresDelivery: { type: Boolean, default: false },
    delivery: {
        address: { type: String, default: '' },
        reference: { type: String, default: '' },
        coordinates: {
            lat: { type: Number }, // Latitud para Google Maps / Waze
            lng: { type: Number }  // Longitud
        },
        assignedTo: { type: String, default: '' }, // ID o Nombre del empleado con rol 'delivery'
        deliveryNotes: { type: String, default: '' }, // Ej: "Golpear fuerte la puerta"
        deliveredAt: { type: Date },
        proofOfDelivery: { type: String, default: '' } // URL de foto o firma cuando se entregue (Futuro)
    },

    // --- ESTADO GENERAL DEL PEDIDO ---
    status: { 
        type: String, 
        enum: [
            'pending',       // Pendiente de confirmación
            'preparing',     // Empaquetando en la tienda
            'ready_for_pickup', // Listo para que el cliente o delivery lo retire
            'in_transit',    // El delivery lo tiene en ruta
            'completed',     // Entregado y cobrado (o vendido directo en mostrador)
            'cancelled'      // Cancelado
        ], 
        default: 'completed' 
    },

    // --- AUDITORÍA Y FECHAS ---
    internalNotes: { type: String, default: '' }, // Notas solo visibles para admin/vendedor
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// ==========================================
// MIDDLEWARES
// ==========================================
saleSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Auto-cálculo de seguridad por si se envían mal los datos desde el frontend
    if (this.items && this.items.length > 0) {
        let calcSubtotal = 0;
        this.items.forEach(item => {
            calcSubtotal += (item.price * item.quantity);
        });
        this.subtotal = calcSubtotal;
        this.totalAmount = (this.subtotal + (this.deliveryFee || 0)) - (this.discount || 0);
    }

    // Si es POS tradicional, normalmente no requiere delivery y se completa al instante
    if (this.saleChannel === 'pos' && !this.requiresDelivery) {
        this.status = 'completed';
    }

    next();
});

module.exports = mongoose.model('Sale', saleSchema);