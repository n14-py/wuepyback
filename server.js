// ==========================================================================
// WUEPY.COM - NÚCLEO DEL SERVIDOR API (Backend Separado)
// ==========================================================================
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors'); 
const path = require('path'); // 🟢 AGREGADO: Necesario para gestionar las rutas de los archivos

// 1. CARGAR CONFIGURACIÓN DE ENTORNO
dotenv.config();

const app = express();

// NUEVO Y VITAL PARA RENDER/CONTABO: Confiar en el proxy (Load Balancer) 
// Esto es obligatorio para que las cookies seguras (https) viajen correctamente
app.set('trust proxy', 1);

// ==========================================
// 2. CONFIGURACIONES Y MIDDLEWARES BASE
// ==========================================

// Configuración de CORS ultra-permisiva adaptada para infinitos subdominios
app.use(cors({
    origin: function (origin, callback) {
        callback(null, true);
    },
    credentials: true, // Obligatorio para que las cookies de sesión viajen
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🟢 NUEVO: SERVIR LOS ARCHIVOS GENERADOS POR LA IA (EL PUENTE AL FRONTEND)
// Como el backend es quien crea físicamente los HTML, Cloudflare no los tiene.
// Exponemos esta carpeta estáticamente para que el Iframe pueda consumirlos directamente de la API.
app.use('/views/templates/ai_stores', express.static(path.join(__dirname, '../wuepy-frontend/views/templates/ai_stores'), {
    setHeaders: (res, path, stat) => {
        res.set('Access-Control-Allow-Origin', '*'); // Permite que el iframe de tu frontend lo lea sin bloqueos
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// --- SISTEMA DE SESIONES DE ALTO RENDIMIENTO ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'wuepy_super_secret_master_key_2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60 
    }),
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 14,
        httpOnly: true,
        // CORRECCIÓN CRÍTICA: Forzamos la seguridad Cross-Domain para siempre.
        // Esto obliga a Chrome/Safari a enviar tu sesión desde Cloudflare hacia Render.
        secure: true, 
        sameSite: 'none' 
    }
}));

// --- AUTENTICACIÓN ---
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 3. ENRUTADOR INTELIGENTE DE SUBDOMINIOS (Adaptado para API pura)
// ==========================================
app.use((req, res, next) => {
    const origin = req.get('origin'); 
    const mainDomain = process.env.MAIN_DOMAIN || 'wuepy.com';

    if (!origin) {
        req.isMainDomain = true;
        req.subdomainName = null;
        return next();
    }

    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1');
    
    if (isLocal) {
        req.isMainDomain = true;
        req.subdomainName = null;
    } else {
        try {
            const urlObj = new URL(origin);
            const hostname = urlObj.hostname;
            
            if (hostname === mainDomain || hostname === `www.${mainDomain}`) {
                req.isMainDomain = true;
                req.subdomainName = null;
            } else {
                req.isMainDomain = false;
                req.subdomainName = hostname.split('.')[0].toLowerCase(); 
            }
        } catch(e) {
            req.isMainDomain = true;
            req.subdomainName = null;
        }
    }
    next();
});

// ==========================================
// 4. REGISTRO DE RUTAS MAESTRAS (API JSON)
// ==========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api', require('./routes/index'));

// Manejador global 404 para rutas inexistentes de la API
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta de la API no encontrada' });
});

// Manejador global de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Error interno del servidor API' });
});

// ==========================================
// 5. INICIALIZACIÓN DE LA MÁQUINA
// ==========================================
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Conectado al Clúster de MongoDB (Wuepy Core - API)');
    app.listen(PORT, () => {
        console.log(`🚀 Servidor API Wuepy ejecutándose en el puerto: ${PORT}`);
        console.log(`🌐 Esperando peticiones del Frontend Wuepy...`);
    });
}).catch(err => {
    console.error('❌ Error fatal de conexión a la Base de Datos:', err);
    process.exit(1); 
});