// services/agentWhatsappService.js
const { default: makeWASocket, DisconnectReason, downloadMediaMessage, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const mongoose = require('mongoose');
const NodeCache = require('node-cache'); 
const { useMongoDBAuthState } = require('./agentAuthState');
const { generarRespuestaIA } = require('./agentAiService');
const { subirImagenBuffer } = require('../utils/bunnyStorage'); // O Cloudinary, según tu config
// Importamos los Modelos INDEPENDIENTES
const Agent = require('../models/Agent');
const AgentOrder = require('../models/AgentOrder');

// --- GESTIÓN DE MULTI-SESIONES ---
// Aquí guardamos los sockets activos: clave = agentId, valor = socket
const sessions = new Map();

// Logger silencioso para producción
const logger = pino({ level: 'silent' });

// Caché para evitar bucles de mensajes repetidos (Deduplicación)
const msgRetryCounterCache = new NodeCache();

/**
 * --- HELPER: PROCESAR CONTENIDO DEL MENSAJE ---
 * Filtra mensajes de sistema, estados, grupos y extrae texto limpio o imagen.
 */
const procesarContenidoMensaje = (msg) => {
    if (!msg.message) return null;
    const tipo = Object.keys(msg.message)[0];
    
    // Ignorar mensajes técnicos o de protocolo
    if (tipo === 'protocolMessage' || tipo === 'senderKeyDistributionMessage') return null;

    let texto = null;
    let esImagen = false;

    try {
        if (tipo === 'conversation') {
            texto = msg.message.conversation;
        } else if (tipo === 'extendedTextMessage') {
            texto = msg.message.extendedTextMessage.text;
        } else if (tipo === 'imageMessage') {
            esImagen = true;
            texto = msg.message.imageMessage.caption || "";
        } else {
            return null; // Ignoramos audios, stickers, videos por ahora
        }
    } catch (e) {
        console.error('Error parseando mensaje:', e.message);
        return null;
    }

    // Filtros de Spam de WhatsApp (Mensajes de sistema)
    if (texto) {
        const t = texto.toLowerCase();
        if (t.includes('mensajes temporales') || t.includes('cifrado de extremo')) return null;
    }

    if (!esImagen && (!texto || texto.trim().length === 0)) return null;

    return { texto, esImagen };
};

/**
 * --- HELPER: VERIFICAR HORARIO DE ATENCIÓN ---
 * Consulta la configuración específica de ESTE agente.
 */
const verificarHorarioAgente = async (agent) => {
    // Usamos el método .isOpen() que definimos en el Modelo Agent.js
    if (!agent.businessConfig.openingHours.enabled) return { abierto: true };
    
    // Recargamos el agente para asegurar config fresca si fuera necesario
    // Pero por performance usamos el objeto pasado por parámetro si está poblado
    
    if (agent.isOpen()) {
        return { abierto: true };
    } else {
        return { 
            abierto: false, 
            inicio: agent.businessConfig.openingHours.start 
        };
    }
};

/**
 * --- HELPER: IDENTIFICAR O CREAR CLIENTE (ORDER) ---
 * Busca si este número ya tiene un chat abierto con ESTE agente.
 */
const identificarCliente = async (agentId, remoteJid, pushName) => {
    const customerPhone = remoteJid.replace('@s.whatsapp.net', '');
    
    // Buscamos un pedido activo (que no esté finalizado ni cancelado)
    // Esto mantiene el "hilo" de la conversación actual.
    let order = await AgentOrder.findOne({
        agent: agentId,
        customerPhone: customerPhone,
        status: { $nin: ['ENTREGADO', 'CANCELADO'] } // Mantenemos contexto mientras no termine
    }).sort({ lastInteraction: -1 });

    if (!order) {
        console.log(`✨ Nuevo cliente para Agente ${agentId}: ${customerPhone}`);
        order = new AgentOrder({
            agent: agentId,
            customerPhone: customerPhone,
            customerName: pushName || "Nuevo Cliente",
            status: 'NUEVO',
            chatHistory: [] // Iniciamos historial vacío
        });
        await order.save();
    }
    
    return order;
};

/**
 * --- FUNCIÓN PRINCIPAL: INICIAR SESIÓN PARA UN AGENTE ---
 * Se llama cuando el usuario activa su bot desde el panel.
 */
const iniciarBotAgente = async (agentId) => {
    try {
        // Evitar duplicar conexiones
        if (sessions.has(agentId)) {
            console.log(`⚠️ El Agente ${agentId} ya tiene sesión activa. Reiniciando...`);
            /* Opcional: Cerrar la anterior si se quiere forzar reinicio */
            // await cerrarSesionAgente(agentId);
            return;
        }

        console.log(`🚀 Iniciando Bot para Agente: ${agentId}`);

        // 1. PREPARAR CREDENCIALES EN MONGO (Colección 'sesiones_whatsapp')
        const collection = mongoose.connection.collection('sesiones_whatsapp');
        const { state, saveCreds } = await useMongoDBAuthState(collection, agentId.toString());
        
        const { version } = await fetchLatestBaileysVersion();

        // 2. CREAR SOCKET
        const sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false, // El QR lo mandamos al frontend, no a consola
            auth: state,
            browser: ["Windows", "Chrome", "1.0.0"],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            msgRetryCounterMap: msgRetryCounterCache,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            getMessage: async () => { return { conversation: 'hello' }; }
        });

        // Guardamos la sesión en memoria
        sessions.set(agentId.toString(), sock);

        // 3. EVENTOS DE CONEXIÓN
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // Generamos QR y lo guardamos en la DB del Agente para que el Frontend lo muestre
                const qrUrl = await QRCode.toDataURL(qr);
                await Agent.findByIdAndUpdate(agentId, { 
                    sessionStatus: 'qr_ready',
                    'wizard.qrCode': qrUrl // Campo temporal o usar socket.io para tiempo real
                });
                console.log(`✨ QR generado para Agente ${agentId}`);
            }

            if (connection === 'open') {
                console.log(`✅ Agente ${agentId} CONECTADO a WhatsApp`);
                await Agent.findByIdAndUpdate(agentId, { 
                    sessionStatus: 'connected',
                    isActive: true
                });
            }

            if (connection === 'close') {
                const reason = lastDisconnect?.error?.output?.statusCode;
                console.log(`⚠️ Conexión cerrada Agente ${agentId}. Razón: ${reason}`);

                // Eliminamos de memoria
                sessions.delete(agentId.toString());
                
                // Actualizamos estado
                await Agent.findByIdAndUpdate(agentId, { sessionStatus: 'disconnected' });

                // Reconexión automática si no es Logout
                if (reason !== DisconnectReason.loggedOut) {
                    setTimeout(() => iniciarBotAgente(agentId), 3000);
                } else {
                    console.log(`⛔ Agente ${agentId} cerró sesión manualmente.`);
                    // Limpieza de credenciales si es necesario
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // 4. PROCESAMIENTO DE MENSAJES (EL BUCLE PRINCIPAL)
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            try {
                const msg = messages[0];
                if (!msg.message || msg.key.fromMe) return;

                const remoteJid = msg.key.remoteJid;
                // Ignorar grupos y estados
                if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') return;

                const contenido = procesarContenidoMensaje(msg);
                if (!contenido) return;

                // --- CARGAR DATOS DEL AGENTE ---
                const agent = await Agent.findById(agentId);
                if (!agent || !agent.isActive) return; // Si el dueño pausó el bot, no respondemos

                // --- VERIFICAR HORARIO ---
                const estadoHorario = await verificarHorarioAgente(agent);
                if (!estadoHorario.abierto) {
                    // Respuesta automática de fuera de horario (Solo una vez cada X tiempo idealmente)
                    await sock.sendMessage(remoteJid, { 
                        text: `🌙 Hola! Nuestra tienda está cerrada. Horario de atención: ${estadoHorario.inicio}:00 hs en adelante. Te responderemos al volver!` 
                    });
                    return;
                }

                // --- IDENTIFICAR CLIENTE ---
                const order = await identificarCliente(agentId, remoteJid, msg.pushName);

                // --- GESTIÓN DE IMÁGENES (COMPROBANTES) ---
                const { texto, esImagen } = contenido;
                let mensajeParaIA = texto || "";
                let urlImagen = null;

                if (esImagen) {
                    try {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger });
                        // Subimos a la nube (Bunny/Cloudinary)
                        urlImagen = await subirImagenBuffer(buffer);
                        
                        // Guardamos en el pedido si es un comprobante potencial
                        order.proofOfPaymentUrl = urlImagen;
                        mensajeParaIA = `[SISTEMA: FOTO RECIBIDA] ${texto || ''}`;
                        
                        // Agregamos al historial visual
                        order.chatHistory.push({ role: 'user', content: "📷 [FOTO ENVIADA POR CLIENTE]" });
                    } catch (e) {
                        console.error('Error subiendo imagen:', e);
                    }
                } else {
                    order.chatHistory.push({ role: 'user', content: texto });
                }

                // Indicador de "Escribiendo..."
                await sock.sendPresenceUpdate('composing', remoteJid);

                // --- LLAMADA AL CEREBRO (GEMINI) ---
                // Pasamos el historial, el pedido y el ID del agente para que la IA sepa quién es
                let respuestaIA = await generarRespuestaIA(mensajeParaIA, order.chatHistory, order, agentId);

                // --- 5. DETECCIÓN Y EXTRACCIÓN DE DATOS (EL CIERRE DE VENTA) ---
                const tagInicio = '[GUARDAR_DATOS';
                const indexInicio = respuestaIA.indexOf(tagInicio);
                const indexFin = respuestaIA.indexOf(']', indexInicio);

                if (indexInicio !== -1 && indexFin !== -1) {
                    console.log(`📝 DATOS DETECTADOS para Agente ${agentId}`);
                    
                    const contenidoEtiqueta = respuestaIA.substring(indexInicio + tagInicio.length, indexFin);
                    const etiquetaCompleta = respuestaIA.substring(indexInicio, indexFin + 1);
                    
                    // Limpiamos la etiqueta del mensaje visible
                    respuestaIA = respuestaIA.replace(etiquetaCompleta, '').trim();

                    // Parseamos los datos con Pipe '|'
                    const partes = contenidoEtiqueta.split('|').map(p => p.trim());
                    // [ | Nombre | Ciudad | Dirección | Producto | Monto | Telefono ]
                    
                    if (partes.length >= 5) {
                        const [empty, nombre, ciudad, direccion, producto, montoStr, telExtra] = partes;
                        
                        // Actualizamos la Base de Datos
                        order.customerName = nombre || order.customerName;
                        order.city = ciudad || "";
                        order.address = direccion || "";
                        order.interestedProduct = producto || "";
                        
                        // Limpieza de monto (sacar puntos, comas, letras)
                        const montoLimpio = montoStr ? parseInt(montoStr.replace(/\D/g, '')) : 0;
                        if (montoLimpio > 0) order.totalAmount = montoLimpio;

                        if (telExtra && telExtra.length > 6) order.customerPhone = telExtra; // Si dio otro número

                        // CAMBIO DE ESTADO: PEDIDO CONFIRMADO
                        order.status = 'PEDIDO_CONFIRMADO';
                        
                        console.log(`💾 Pedido Guardado: ${nombre} - Gs. ${montoLimpio}`);
                    }
                }

                // --- RESPONDER AL CLIENTE ---
                if (respuestaIA && respuestaIA.length > 0) {
                    await sock.sendMessage(remoteJid, { text: respuestaIA });
                    order.chatHistory.push({ role: 'model', content: respuestaIA });
                }

                // Actualizar timestamp
                order.lastInteraction = new Date();
                await order.save();

            } catch (err) {
                console.error(`❌ Error en bucle de mensajes Agente ${agentId}:`, err);
            }
        });

    } catch (error) {
        console.error(`❌ Error Fatal iniciando Agente ${agentId}:`, error);
    }
};

/**
 * --- FUNCIÓN: ENVIAR MENSAJE PROACTIVO ---
 * Usada por el Panel para notificaciones (ej: "Tu pedido salió")
 */
const enviarMensajeAgente = async (agentId, telefono, texto) => {
    try {
        const sock = sessions.get(agentId.toString());
        if (!sock) {
            console.warn(`⚠️ Intento de envío sin sesión activa: Agente ${agentId}`);
            return false;
        }

        let jid = telefono.trim();
        if (!jid.includes('@')) jid = `${jid}@s.whatsapp.net`;

        await sock.sendMessage(jid, { text: texto });
        return true;
    } catch (e) {
        console.error(`Error enviando mensaje proactivo Agente ${agentId}:`, e);
        return false;
    }
};

/**
 * --- FUNCIÓN: CERRAR SESIÓN (LOGOUT) ---
 */
const cerrarSesionAgente = async (agentId) => {
    try {
        const sock = sessions.get(agentId.toString());
        if (sock) {
            sock.end(undefined);
            sessions.delete(agentId.toString());
        }
        
        // Limpiamos también de la BD para pedir QR nuevo
        const collection = mongoose.connection.collection('sesiones_whatsapp');
        await collection.deleteOne({ _id: `session_${agentId}` });
        
        await Agent.findByIdAndUpdate(agentId, { sessionStatus: 'disconnected' });
        console.log(`🔌 Sesión cerrada para Agente ${agentId}`);
        return true;
    } catch (e) {
        return false;
    }
};

// Exportamos las funciones para usarlas en las rutas (API)
module.exports = { 
    iniciarBotAgente, 
    enviarMensajeAgente, 
    cerrarSesionAgente,
    sessions // Exportamos el mapa por si necesitamos debug
};