const mongoose = require('mongoose');

// ==========================================
// ESQUEMA DE EMPLEADOS Y LOGÍSTICA
// ==========================================
const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['ventas', 'inventario', 'admin', 'delivery'], 
        default: 'ventas' 
    },
    phone: { type: String, default: '' }, 
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// ==========================================
// ESQUEMA DE RECIBOS DE PAGO (Suscripciones Manuales)
// ==========================================
const paymentReceiptSchema = new mongoose.Schema({
    amount: { type: Number, required: true }, // Ej: 30000, 60000, 150000
    currency: { type: String, enum: ['PYG', 'USD'], default: 'PYG' },
    receiptUrl: { type: String, required: true }, // URL de la imagen en Bunny/R2
    planRequested: { type: String, enum: ['basico', 'medio', 'profesional'], required: true },
    monthsPaid: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    aliasOrBankUsed: { type: String, default: '' }, // A qué alias transfirió
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    adminNotes: { type: String, default: '' } // Por si rechazas, decirle "Foto borrosa"
});

// ==========================================
// ESQUEMA PRINCIPAL DEL SITIO / TIENDA (WUEPY)
// ==========================================
const siteSchema = new mongoose.Schema({
    // Propietario de la cuenta
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // --- IDENTIDAD Y TIPO DE NEGOCIO ---
    name: { type: String, required: true, trim: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    businessType: { 
        type: String, 
        enum: ['tienda_online', 'gastronomia', 'tienda_fisica', 'servicios', 'salud_belleza', 'gimnasio', 'fabrica', 'inmobiliaria', 'otro', ''], 
        default: 'tienda_online' 
    },
    logoUrl: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    
    // --- MARKETPLACE GLOBAL (Visión AliExpress Paraguay) ---
    showInMarketplace: { type: Boolean, default: true }, 
    
    // --- PLANES Y ESTADO DE SUSCRIPCIÓN ---
    // Básico: 30.000 Gs (1 Web) | Medio: 60.000 Gs (3 Webs + IA) | Profesional: 150.000 Gs (10 Webs)
    plan: { type: String, enum: ['basico', 'medio', 'profesional'], default: 'basico' },
    subscriptionStatus: { 
        type: String, 
        enum: ['trial', 'active', 'pending_payment', 'expired', 'suspended'], 
        default: 'trial' 
    },
    trialEndsAt: { type: Date }, 
    nextBillingDate: { type: Date }, 
    expirationWarningSent: { type: Boolean, default: false }, // Control para no spamear avisos de "por vencer"
    bonusDays: { type: Number, default: 0 }, // Días ganados por el programa "Invita y Gana"
    paymentReceipts: [paymentReceiptSchema], 
    
    // --- PROGRAMA 1: WUEPY APOYA (6 Meses Gratis - Fidelización) ---
    wuepyApoya: {
        status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
        startupStory: { type: String, default: '' }, 
        videoEvidenceUrl: { type: String, default: '' }, 
        freeMonthsGranted: { type: Number, default: 0 }
    },

    // --- PROGRAMA 2: WUEPY INVIERTE (Microcréditos a Fabricantes) ---
    wuepyInvierte: {
        status: { type: String, enum: ['none', 'eligible', 'pending', 'active', 'completed'], default: 'none' },
        requestedAmount: { type: Number, default: 0 },
        approvedAmount: { type: Number, default: 0 },
        amountRepaid: { type: Number, default: 0 }, 
        businessPitch: { type: String, default: '' }, 
        evidenceFiles: [{ type: String }] 
    },
    
    // --- IA Y MOTOR DE DISEÑO ---
    designMode: { type: String, enum: ['template', 'ai_generated'], default: 'template' },
    aiPrompt: { type: String, default: '' },
    customHtmlFolder: { type: String, default: '' }, 
    
    // Almacenamiento directo del código generado por DeepSeek
    aiGeneratedPages: [{
        filename: { type: String, required: true }, 
        htmlContent: { type: String, required: true } 
    }],
    
    // --- CONFIGURACIÓN VISUAL DIRECTA ---
    template: { type: String, default: 'template1' },
    primaryColor: { type: String, default: '#3b82f6' },
    secondaryColor: { type: String, default: '#1e293b' },
    
    // --- CONFIGURACIÓN DE MONEDA ---
    currency: { type: String, enum: ['PYG', 'USD'], default: 'PYG' },
    
    // --- EMPLEADOS ---
    employees: [employeeSchema],
    
    // --- CONTACTO Y REDES ---
    contact: {
        whatsapp: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        schedule: { type: String, default: '' },
        address: { type: String, default: '' }
    },
    social: {
        facebook: { type: String, default: '' },
        instagram: { type: String, default: '' },
        tiktok: { type: String, default: '' }
    },
    
    // --- CONTENIDO DE PORTADA ---
    content: {
        heroTitle: { type: String, default: '' },
        heroSubtitle: { type: String, default: '' },
        aboutText: { type: String, default: '' }
    },
    
    // --- ESTADO GENERAL Y FECHAS ---
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware para actualizar el `updatedAt` automáticamente
siteSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Site', siteSchema);