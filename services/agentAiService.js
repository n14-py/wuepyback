// services/agentAiService.js
const OpenAI = require("openai"); // Usamos la librería estándar compatible con DeepSeek
const Agent = require('../models/Agent');
const AgentProduct = require('../models/AgentProduct');

/**
 * --- SERVICIO DE INTELIGENCIA ARTIFICIAL (NÚCLEO DE VENTAS - DEEPSEEK EDITION) ---
 * * Este módulo es el cerebro de la tienda.
 * * Ahora potenciado por DeepSeek V3 para mayor razonamiento y obediencia.
 */

// Función auxiliar para formatear precios en Guaraníes
const formatoGs = (precio) => new Intl.NumberFormat('es-PY').format(precio);

const generarRespuestaIA = async (mensajeUsuario, historial, order, agentId) => {
    try {
        // ==================================================================
        // 1. CARGA DE DATOS VITALES
        // ==================================================================
        
        const agent = await Agent.findById(agentId);
        if (!agent) throw new Error("CRITICAL: Agente no encontrado.");

        const productos = await AgentProduct.find({ agent: agentId, isActive: true }).sort({ name: 1 });

        // LOGICA DE API KEY:
        // Si usas la del sistema (.env), busca DEEPSEEK_API_KEY.
        // Si el agente tiene su propia key, usa esa (asumiendo que pegaste la de DeepSeek en el campo de Gemini en el dashboard).
        const apiKey = agent.aiConfig.usePlatformKey 
            ? process.env.DEEPSEEK_API_KEY 
            : agent.aiConfig.geminiApiKey; // Reutilizamos el campo de la BD por ahora

        if (!apiKey) return "Disculpa, estoy en mantenimiento técnico (Falta API Key).";

        // ==================================================================
        // 2. CONSTRUCCIÓN DEL CATÁLOGO
        // ==================================================================
        
        let catalogoTexto = "";
        if (productos.length > 0) {
            catalogoTexto = productos.map((p, index) => 
                `OPCIÓN ${index + 1}: ${p.name.toUpperCase()} 
                - Precio: Gs. ${formatoGs(p.price)}
                - Info Clave: ${p.aiDescription || 'Excelente calidad.'}`
            ).join('\n\n');
        } else {
            catalogoTexto = "ACTUALMENTE NO HAY STOCK DISPONIBLE.";
        }

        // ==================================================================
        // 3. REGLAS DE NEGOCIO Y LOGÍSTICA
        // ==================================================================
        
        const costoEnvio = agent.businessConfig.shippingCost;
        let textoEnvio = costoEnvio === 0 
            ? "🔥 ¡EL ENVÍO ES TOTALMENTE GRATIS! (La casa invita) 🎁"
            : `🚚 El costo de envío es de Gs. ${formatoGs(costoEnvio)} adicionales.`;

        const zonasActivas = agent.businessConfig.shippingRegions
            .filter(z => z.active)
            .map(z => z.name)
            .join(', ');

        const infoBancaria = agent.paymentConfig.bankInfo || "No hay datos bancarios registrados.";

        // ==================================================================
        // 4. PLANTILLAS DE VENTA (BALAS DE PLATA)
        // ==================================================================

        const PLANTILLA_DATOS_DELIVERY = `
📦 *DATOS PARA EL DELIVERY* 🛵
¡Perfecto! Para agendar tu pedido, por favor completame:

📝 Nombre Completo:
📍 Ciudad y Barrio:
🏠 Referencia de la casa (Color, portón, etc):
📍 Ubicación GPS (Opcional, ayuda mucho):

¡Aguardamos tus datos para enviarlo ya! 🚀`;

        const PLANTILLA_DATOS_ENCOMIENDA = `
📦 *DATOS PARA ENCOMIENDA* 🚛
Para despachar tu paquete por transportadora, necesitamos:

👤 Nombre Completo:
🪪 Número de Cédula (Para la guía):
🏙️ Ciudad de Destino:
📞 Teléfono de quien retira:

⚠️ *IMPORTANTE:* El envío por encomienda requiere pago previo del producto.`;

        const PLANTILLA_PAGO = `
💳 *DATOS PARA EL PAGO*
Aquí tienes los datos para asegurar tu pedido:

${infoBancaria}

📸 *Por favor, envíanos la foto del comprobante una vez realizado.*`;

        // ==================================================================
        // 5. SYSTEM PROMPT (EL CEREBRO MAESTRO)
        // ==================================================================
        
        const systemPrompt = `
        ROL: Eres ${agent.botName}, la mejor vendedora de la tienda.
        PERSONALIDAD: ${agent.aiConfig.personality.toUpperCase()}. ${agent.aiConfig.tone}
        
        --- 🎯 TU ÚNICO OBJETIVO ---
        Atender al cliente, resolver dudas sobre los productos y CERRAR LA VENTA consiguiendo los datos de entrega.
        
        --- 🛒 CATÁLOGO OFICIAL (SOLO VENDES ESTO) ---
        ${catalogoTexto}

        --- 🚚 POLÍTICA DE ENVÍOS ---
        ${textoEnvio}
        Zonas de cobertura directa: ${zonasActivas}.
        Para otras ciudades lejanas, usamos ENCOMIENDAS (Transportadora).

        --- 🧠 REGLAS DE COMPORTAMIENTO (STRICT MODE) ---
        1. **Interpretación:** Si el cliente dice "quiero el 1", mira tu catálogo y asume que es la OPCIÓN 1.
        2. **Precios:** NUNCA inventes precios. Usa estrictamente los del catálogo.
        3. **Cierre de Venta:**
           - Si es DELIVERY (Zona cercana): Pide los datos usando la PLANTILLA DE DELIVERY.
           - Si es ENCOMIENDA (Interior/Lejos): Pide los datos usando la PLANTILLA DE ENCOMIENDA y pasa los DATOS DE PAGO.
           
        4. **Plantillas:**
           - Cuando pidas datos para moto, USA ESTO: """${PLANTILLA_DATOS_DELIVERY}"""
           - Cuando pidas datos para encomienda, USA ESTO: """${PLANTILLA_DATOS_ENCOMIENDA}"""
           - Cuando te pidan cuenta bancaria, USA ESTO: """${PLANTILLA_PAGO}"""

        5. **Imágenes:** Si recibes el texto "[SISTEMA: FOTO RECIBIDA]":
           - Si estabas esperando un pago -> Es el comprobante. Agradece y confirma.
           - Si es al inicio -> Es una consulta visual.

        --- 💾 EXTRACCIÓN DE DATOS (CRÍTICO) ---
        CUANDO (Y SOLO CUANDO) EL CLIENTE TE HAYA DADO SUS DATOS COMPLETOS (Nombre y Dirección/Ciudad),
        debes confirmar el pedido generando una ETIQUETA OCULTA al final de tu mensaje.
        
        FORMATO OBLIGATORIO DE LA ETIQUETA:
        [GUARDAR_DATOS | Nombre Cliente | Ciudad | Dirección_y_Ref | Producto_Elegido | Monto_Total_Numerico | Telefono_Contacto]

        * Monto_Total_Numerico: Solo el número (Ej: 150000). Suma precio + envío si aplica.
        * Telefono_Contacto: Si el cliente escribió otro número en el chat, ponlo. Si no, deja vacío.
        
        SI GENERAS LA ETIQUETA, TU MENSAJE FINAL AL CLIENTE DEBE SER:
        "¡Excelente! 🎉 Tu pedido ha sido registrado correctamente. En breve nos comunicaremos contigo para coordinar la entrega. ¡Gracias por tu compra!"
        (No agregues más preguntas después de esto).
        `;

        // ==================================================================
        // 6. GESTIÓN DE HISTORIAL (FORMATO OPENAI/DEEPSEEK)
        // ==================================================================
        
        // Transformamos el historial de DB al formato estándar { role: 'user'|'assistant', content: '' }
        const chatHistory = historial.map(msg => {
            return {
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            };
        });

        // Agregamos el mensaje actual del usuario al final
        chatHistory.push({ role: "user", content: mensajeUsuario });

        // Preparamos el array final de mensajes incluyendo el Sistema al principio
        const messagesPayload = [
            { role: "system", content: systemPrompt },
            ...chatHistory
        ];

        // ==================================================================
        // 7. CONEXIÓN CON DEEPSEEK (VIA OPENAI LIB)
        // ==================================================================

        const openai = new OpenAI({
            baseURL: 'https://api.deepseek.com', // Endpoint oficial de DeepSeek
            apiKey: apiKey
        });

        const completion = await openai.chat.completions.create({
            messages: messagesPayload,
            model: "deepseek-chat", // DeepSeek V3 (Rápido y muy inteligente)
            temperature: 0.3,       // Frio y calculador para no inventar precios
            max_tokens: 1000
        });

        let respuestaTexto = completion.choices[0].message.content;

        // ==================================================================
        // 8. LIMPIEZA Y POST-PROCESAMIENTO
        // ==================================================================

        // WhatsApp usa un solo asterisco para negrita, DeepSeek usa MD estándar (**).
        respuestaTexto = respuestaTexto.replace(/\*\*/g, '*');

        return respuestaTexto;

    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN IA SERVICE (DEEPSEEK):", error);
        return "⚠️ Tuve un pequeño parpadeo en mi sistema. ¿Podrías repetirme eso último por favor? 🙏";
    }
};

module.exports = { generarRespuestaIA };