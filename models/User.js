const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // Opcional si usa Google
    googleId: { type: String },
    
    // Perfil
    profilePic: { type: String, default: '/img/default-avatar.png' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    
    // Seguridad y Verificación
    isVerifiedEmail: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // Autenticación de Dos Factores (2FA)
    twoFactorSecret: String,
    isTwoFactorEnabled: { type: Boolean, default: false },

    // Datos del Cliente (SaaS)
    plan: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
    createdAt: { type: Date, default: Date.now }
});

// Encriptar contraseña antes de guardar
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) { next(err); }
});

module.exports = mongoose.model('User', UserSchema);