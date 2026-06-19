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
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['PYG', 'USD'], default: 'PYG' },
    receiptUrl: { type: String, required: true }, // URL de la imagen (R2/Bunny Storage)
    planRequested: { type: String, enum: ['basico', 'medio', 'profesional'], required: true },
    monthsPaid: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    aliasOrBankUsed: { type: String, default: '' }, 
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    adminNotes: { type: String, default: '' } 
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
    showInMarketplace: { type: Boolean, default: true }, // Si sus productos salen en Wuepy Global
    
    // --- PLANES Y ESTADO DE SUSCRIPCIÓN ---
    plan: { type: String, enum: ['basico', 'medio', 'profesional'], default: 'basico' },
    subscriptionStatus: { 
        type: String, 
        enum: ['trial', 'active', 'pending_payment', 'expired', 'suspended'], 
        default: 'trial' 
    },
    trialEndsAt: { type: Date }, // 1 Mes Gratis para todos al iniciar
    nextBillingDate: { type: Date }, 
    paymentReceipts: [paymentReceiptSchema], 
    
    // --- PROGRAMA 1: WUEPY APOYA (6 Meses Gratis - Fidelización) ---
    wuepyApoya: {
        status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
        startupStory: { type: String, default: '' }, // Historia en texto
        videoEvidenceUrl: { type: String, default: '' }, // URL del video subido desde el Dashboard
        freeMonthsGranted: { type: Number, default: 0 }
    },

    // --- PROGRAMA 2: WUEPY INVIERTE (Microcréditos a Fabricantes) ---
    // Visión a futuro: Apoyar a fabricantes paraguayos (Ej: Guampas/Termos) para exportar sin comisiones
    wuepyInvierte: {
        status: { type: String, enum: ['none', 'eligible', 'pending', 'active', 'completed'], default: 'none' },
        requestedAmount: { type: Number, default: 0 },
        approvedAmount: { type: Number, default: 0 },
        amountRepaid: { type: Number, default: 0 }, // Se va sumando a medida que venden en la web
        businessPitch: { type: String, default: '' }, // ¿Para qué necesitan el capital?
        evidenceFiles: [{ type: String }] // URLs con fotos del taller, la fábrica, productos, etc.
    },
    
    // --- IA Y MOTOR DE DISEÑO (Orquestador Gemma) ---
    designMode: { type: String, enum: ['template', 'ai_generated'], default: 'template' },
    aiPrompt: { type: String, default: '' },
    customHtmlFolder: { type: String, default: '' }, // Para buscar vistas generadas por IA
    
    // --- CONFIGURACIÓN VISUAL DIRECTA (Si usa 'template') ---
    template: { type: String, default: 'template1' },
    primaryColor: { type: String, default: '#3b82f6' },
    secondaryColor: { type: String, default: '#1e293b' },
    
    // --- CONFIGURACIÓN DE MONEDA ---
    currency: { type: String, enum: ['PYG', 'USD'], default: 'PYG' },
    
    // --- EMPLEADOS (Accesos sectorizados) ---
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

// Middleware para actualizar el `updatedAt` automáticamente antes de cada save
siteSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Site', siteSchema);