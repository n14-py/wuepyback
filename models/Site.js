const mongoose = require('mongoose');

const SiteSchema = new mongoose.Schema({
    // Relación con el usuario dueño
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Identidad del Sitio
    name: { type: String, required: true, trim: true },
    subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl: { type: String }, // URL de BunnyCDN
    
    // Diseño y Apariencia
    template: { type: String, default: 'template1' },
    primaryColor: { type: String, default: '#3b82f6' },
    secondaryColor: { type: String, default: '#1e293b' },
    
    // Contenido y Textos (Landing Page)
    content: {
        heroTitle: { type: String, default: 'Bienvenido a nuestra tienda' },
        heroSubtitle: { type: String, default: 'Los mejores productos al mejor precio' },
        aboutTitle: { type: String, default: 'Sobre Nosotros' },
        aboutText: { type: String, default: 'Somos un negocio comprometido con la calidad...' },
        footerText: { type: String, default: 'Todos los derechos reservados.' }
    },

    // --- NUEVO: CONTACTO Y WHATSAPP (Vital para ventas) ---
    contact: {
        whatsapp: { type: String, required: true }, // Número puro para la API (ej: 595981...)
        phone: { type: String }, // Para mostrar visualmente (ej: +595 981...)
        email: { type: String },
        address: { type: String }, // Dirección física
        mapUrl: { type: String }, // Link de Google Maps (Opcional)
        schedule: { type: String } // Horario de atención (Ej: Lun-Vie 8am a 6pm)
    },

    // --- NUEVO: REDES SOCIALES ---
    social: {
        facebook: { type: String },
        instagram: { type: String },
        tiktok: { type: String },
        twitter: { type: String }
    },

    // Configuración Técnica
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Site', SiteSchema);