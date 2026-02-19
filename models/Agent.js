const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
    // ==========================================
    // 1. DUEÑO DEL BOT (VINCULACIÓN)
    // ==========================================
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // ==========================================
    // 2. IDENTIDAD PÚBLICA (PASO 1)
    // ==========================================
    botName: {
        type: String,
        default: 'Mi Tienda IA',
        trim: true
    },
    phoneNumber: { // El número de WhatsApp conectado
        type: String,
        trim: true,
        default: ''
    },
    description: {
        type: String,
        default: 'Tu asistente virtual de ventas capaz de atender clientes y cerrar pedidos 24/7.'
    },
    logoUrl: {
        type: String,
        default: '/public/img/default-bot.png'
    },

    // ==========================================
    // 3. CONFIGURACIÓN DE IA (GEMINI) (PASO 2)
    // ==========================================
    aiConfig: {
        personality: {
            type: String,
            enum: ['amigable', 'formal', 'entusiasta', 'broma'],
            default: 'amigable'
        },
        tone: {
            type: String,
            default: 'Eres un asistente útil y amable. Usas emojis para dar vida a la charla.'
        },
        customInstructions: { // "Prompt del sistema" extra
            type: String,
            default: ''
        },
        usePlatformKey: { // ¿Usa la key de LFAF o una propia?
            type: Boolean,
            default: true
        },
        geminiApiKey: { // Por si el usuario quiere usar su propia API Key
            type: String,
            select: false // Se oculta por defecto en consultas normales por seguridad
        }
    },

    // ==========================================
    // 4. LOGÍSTICA Y REGLAS DE NEGOCIO (PASO 3)
    // ==========================================
    businessConfig: {
        shippingCost: {
            type: Number,
            default: 0 // Si es 0, la IA asumirá "Envío Gratis"
        },
        freeShippingThreshold: { // "Envío gratis si compras más de X guaraníes"
            type: Number,
            default: 0
        },
        shippingRegions: [{ // Lista de ciudades/zonas
            name: String,
            cost: Number,
            active: { type: Boolean, default: true }
        }],
        openingHours: {
            start: { type: Number, default: 8 }, // Hora inicio (0-23)
            end: { type: Number, default: 20 },  // Hora fin (0-23)
            enabled: { type: Boolean, default: true } // Si es false, atiende 24h
        }
    },

    // ==========================================
    // 5. DATOS DE PAGO (PASO 4)
    // ==========================================
    paymentConfig: {
        bankInfo: { // Texto con CBU/Alias/Banco que enviará la IA
            type: String,
            default: '' 
        },
        requirePaymentProof: { // Si es true, la IA pedirá foto del comprobante
            type: Boolean,
            default: false
        }
    },

    // ==========================================
    // 6. ESTADO DEL WIZARD (CONFIGURACIÓN)
    // ==========================================
    wizard: {
        step1Completed: { type: Boolean, default: false }, // Identidad
        step2Completed: { type: Boolean, default: false }, // IA
        step3Completed: { type: Boolean, default: false }, // Logística
        step4Completed: { type: Boolean, default: false }, // Pagos
        isFullyConfigured: { type: Boolean, default: false },
        
        // --- CAMPO CRÍTICO AGREGADO PARA EL QR ---
        qrCode: { type: String, default: '' } 
    },

    // ==========================================
    // 7. ESTADO TÉCNICO Y CONEXIÓN
    // ==========================================
    isActive: {
        type: Boolean,
        default: true
    },
    sessionStatus: { // Estado de la sesión de WhatsApp
        type: String,
        enum: ['disconnected', 'qr_ready', 'authenticated', 'connected'],
        default: 'disconnected'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ==========================================
// MÉTODOS AUXILIARES
// ==========================================

// Método para saber si la tienda está "abierta" en este instante
AgentSchema.methods.isOpen = function() {
    if (!this.businessConfig.openingHours.enabled) return true;
    
    // Obtenemos la hora actual del servidor
    const now = new Date();
    const currentHour = now.getHours(); 
    
    return currentHour >= this.businessConfig.openingHours.start && 
           currentHour < this.businessConfig.openingHours.end;
};

module.exports = mongoose.model('Agent', AgentSchema);