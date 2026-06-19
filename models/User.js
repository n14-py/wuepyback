const mongoose = require('mongoose');

// ==========================================
// ESQUEMA DE USUARIOS (SaaS WUEPY)
// ==========================================
const userSchema = new mongoose.Schema({
    // --- DATOS PERSONALES ---
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    
    // --- ROLES Y PERMISOS EN LA PLATAFORMA ---
    // 'store_owner': Emprendedor que alquila su tienda en Wuepy
    // 'superadmin': Tú, el administrador maestro con acceso al Super Panel
    // 'support': Agente de atención para el botón de WhatsApp
    role: { 
        type: String, 
        enum: ['store_owner', 'superadmin', 'support'], 
        default: 'store_owner' 
    },
    
    // --- SEGURIDAD Y VERIFICACIÓN ---
    isEmailVerified: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    lastLogin: { type: Date },

    // --- CONTROL DESDE EL SUPER PANEL ---
    // Para que desde tu vista de superadmin puedas bloquear usuarios si hay fraude o no pagan
    accountStatus: {
        type: String,
        enum: ['active', 'suspended', 'banned'],
        default: 'active'
    },
    suspensionReason: { type: String, default: '' },

    // --- CONTACTO Y NOTIFICACIONES ---
    phone: { type: String, default: '' }, // Número para avisos de WhatsApp (integración futura de facturación)
    receivesWuepyUpdates: { type: Boolean, default: true }, // Novedades de la plataforma para retener a los emprendedores

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// ==========================================
// MIDDLEWARES
// ==========================================
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('User', userSchema);