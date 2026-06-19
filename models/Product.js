const mongoose = require('mongoose');

// ==========================================
// ESQUEMA DE VARIACIONES (Tallas, Colores, etc)
// ==========================================
const variantSchema = new mongoose.Schema({
    sku: { type: String, trim: true, default: '' },
    name: { type: String, required: true, trim: true }, // Ej: "Rojo - Talla M" o "100ml"
    additionalPrice: { type: Number, default: 0 }, // Por si esta variante cuesta más que el precio base
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
});

// ==========================================
// ESQUEMA DE PRODUCTOS (INVENTARIO Y MARKETPLACE WUEPY)
// ==========================================
const productSchema = new mongoose.Schema({
    // Relación directa con la tienda (proveedor) a la que pertenece
    site: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
        required: true,
        index: true // Optimización crítica para cargar rápido el panel de cada tienda
    },
    
    // --- DATOS BÁSICOS ---
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    shortDescription: { type: String, default: '', trim: true }, // Subtítulo o resumen para la vista "AliExpress"
    
    // --- INTEGRACIÓN CON IA ---
    aiGenerated: { type: Boolean, default: false }, // Bandera para saber si Gemma orquestó o mejoró esta descripción
    
    // --- PRECIOS Y MONEDA ---
    price: { type: Number, required: true, min: 0 }, // Precio base (Generalmente en Gs.)
    priceUSD: { type: Number, default: 0 }, // Campo para conversión rápida
    compareAtPrice: { type: Number, default: 0 }, // Precio "Antes X" (Para generar efecto de oferta/descuento)
    
    // --- CONTROL DE INVENTARIO Y VARIANTES ---
    stock: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 }, // Aviso para el "Inventario Mejorado"
    sku: { type: String, trim: true, default: '' }, // Código de barra o identificador único
    hasVariants: { type: Boolean, default: false }, // Activa el uso del array 'variants'
    variants: [variantSchema],
    
    // --- CLASIFICACIÓN Y MARKETPLACE GLOBAL (Visión AliExpress) ---
    showInGlobalMarketplace: { type: Boolean, default: true }, // Si es true, la gente lo puede encontrar en el buscador global
    category: { type: String, default: 'General' }, // Categoría interna de la tienda (Ej: "Remeras de Verano")
    globalCategory: { type: String, default: 'Otros', index: true }, // Categoría estandarizada de Wuepy (Ej: "Ropa y Accesorios")
    tags: [{ type: String, trim: true, lowercase: true }], // Palabras clave para la barra de búsqueda general
    
    // --- LOGÍSTICA Y DELIVERY ---
    shipping: {
        weightKg: { type: Number, default: 0 },
        isFragile: { type: Boolean, default: false }, // Aviso para el delivery en su panel
        requiresColdChain: { type: Boolean, default: false } // Útil para comercios gastronómicos locales
    },
    
    // --- MÉTRICAS DE POPULARIDAD (Social Proof) ---
    views: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 }, // Se autoincrementa cuando se confirma un pedido/delivery
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    
    // --- MEDIA ---
    imageUrl: { type: String, default: '' }, // Portada principal del producto
    galleryUrls: [{ type: String }], // Array para imágenes secundarias alojadas en el storage
    
    // --- ESTADO ---
    isActive: { type: Boolean, default: true },
    
    // --- AUDITORÍA DE EMPLEADOS ---
    createdBy: { type: String, default: 'admin' },
    lastModifiedBy: { type: String, default: 'admin' }, // Registra si un empleado de 'inventario' hizo el cambio
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// ==========================================
// ÍNDICES PARA EL BUSCADOR GLOBAL (Súper Importante)
// ==========================================
// Crea un índice de texto para que las búsquedas desde la vista de "AliExpress" sean instantáneas y precisas
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
// Índice para filtrar rápidamente los productos que sí quieren aparecer en el marketplace público
productSchema.index({ showInGlobalMarketplace: 1, globalCategory: 1, isActive: 1 });

// ==========================================
// MIDDLEWARES
// ==========================================
productSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Si el producto tiene variantes, el stock total se calcula sumando el stock de todas las variantes activas
    if (this.hasVariants && this.variants && this.variants.length > 0) {
        let totalVariantStock = 0;
        this.variants.forEach(v => {
            if (v.isActive) {
                totalVariantStock += (v.stock || 0);
            }
        });
        this.stock = totalVariantStock;
    }
    
    next();
});

module.exports = mongoose.model('Product', productSchema);