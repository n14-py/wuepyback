// server.js COMPLETO LFAF TECH
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash'); // Corrige: req.flash is not a function

// 1. CARGAR CONFIGURACIÓN
dotenv.config();

// 2. IMPORTAR SERVICIOS DE AGENTE (IA)
const { iniciarBotAgente } = require('./services/agentWhatsappService');
const Agent = require('./models/Agent');

const app = express();

// ==========================================
// 3. CONFIGURACIONES Y MIDDLEWARES
// ==========================================

// Parseo de datos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos Estáticos (CSS, JS, IMGs públicos)
app.use(express.static(path.join(__dirname, 'public')));

// --- MOTOR DE VISTAS (Corrige: No default engine specified) ---
// Usamos EJS para renderizar archivos .html
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile); 
app.set('view engine', 'html');

// Configuración de Sesión (Persistente en Mongo)
app.use(session({
    secret: process.env.SESSION_SECRET || 'lfaftech_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 horas
}));

// Autenticación y Mensajes Flash
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash()); 

// Variables Globales (Para usar en cualquier HTML)
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});


// ... (después de app.use(flash()); y el middleware de variables globales)

// ==========================================
// MIDDLEWARE DE SUBDOMINIOS (CORREGIDO PARA LOCALHOST)
// ==========================================
app.use((req, res, next) => {
    const host = req.get('host'); // Ej: "alinishop.localhost:3000"
    const mainDomain = 'lfaftech.com';
    
    // Detectamos si estamos en entorno local
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

    if (isLocal) {
        // --- LÓGICA PARA LOCALHOST ---
        // Dividimos por puntos. 
        // "localhost:3000" -> ["localhost:3000"] (Length 1) -> Es Principal
        // "alinishop.localhost:3000" -> ["alinishop", "localhost:3000"] (Length 2) -> Es Tienda
        const parts = host.split('.');

        if (parts.length > 1 && !parts[0].includes('localhost')) {
            req.isMainDomain = false;
            req.subdomainName = parts[0]; // "alinishop"
        } else {
            req.isMainDomain = true;
            req.subdomainName = null;
        }

    } else {
        // --- LÓGICA PARA PRODUCCIÓN (lfaftech.com) ---
        if (host === mainDomain || host === `www.${mainDomain}`) {
            req.isMainDomain = true;
            req.subdomainName = null;
        } else {
            req.isMainDomain = false;
            // "tienda.lfaftech.com" -> ["tienda", "lfaftech", "com"] -> tomamos el [0]
            req.subdomainName = host.split('.')[0]; 
        }
    }
    
    // Descomenta esto si quieres ver en la consola qué está detectando:
    // console.log(`Host: ${host} | Es Principal: ${req.isMainDomain} | Subdominio: ${req.subdomainName}`);
    
    next();
});

// ==========================================
// 4. REGISTRO DE RUTAS (ORDEN CRÍTICO)
// ==========================================

// A) RUTAS DE API (BACKEND AGENTES)
app.use('/api/agents', require('./routes/agents'));
app.use('/api/agent-products', require('./routes/agentProducts'));
app.use('/api/agent-orders', require('./routes/agentOrders'));
app.use('/api/agent-deliveries', require('./routes/agentDeliveries'));

// B) RUTAS DE AUTENTICACIÓN
app.use('/auth', require('./routes/auth'));

// C) RUTAS DEL DASHBOARD (Aquí vive el POS, Agentes e Inventario)
app.use('/dashboard', require('./routes/dashboard'));

// D) RUTA PRINCIPAL Y SUBDOMINIOS (SIEMPRE AL FINAL)
// Esta ruta maneja "tutienda.lfaftech.com" y la landing page.
// Si la pones antes, bloqueará todo lo demás.
app.use('/', require('./routes/index'));

// ==========================================
// 5. ARRANQUE DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Conectado a MongoDB (LFAF Tech Cloud)');

        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
            // Auto-reconexión de Bots de WhatsApp
            inicializarBotsActivos();
        });
    })
    .catch(err => console.error('❌ Error de conexión BD:', err));

/**
 * Función para levantar los bots de WhatsApp que estaban encendidos
 */
async function inicializarBotsActivos() {
    try {
        console.log('🔄 Verificando bots para reconexión...');
        const agentesActivos = await Agent.find({ isActive: true });
        
        if (agentesActivos.length > 0) {
            console.log(`⚡ Reconectando ${agentesActivos.length} bots...`);
            for (const agente of agentesActivos) {
                // Pequeña pausa para no saturar el arranque
                await new Promise(resolve => setTimeout(resolve, 2000));
                iniciarBotAgente(agente._id).catch(e => console.error(`Error bot ${agente._id}:`, e.message));
            }
        } else {
            console.log('ℹ️ Ningún bot activo pendiente.');
        }
    } catch (error) {
        console.error('❌ Error en inicializarBotsActivos:', error);
    }
}