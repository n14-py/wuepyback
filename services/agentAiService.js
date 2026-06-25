// ==========================================================================
// WUEPY.COM - EL CEREBRO ORQUESTADOR IA (DeepSeek V4/V3 via DeepInfra)
// ARQUITECTURA INFINITA: 100% TAILWIND DINÁMICO + INYECCIÓN DE DB
// ==========================================================================
const path = require('path');
const Site = require('../models/Site');

class AgentAiService {
    constructor() {
        this.apiKey = process.env.DEEPINFRA_API_KEY;
        this.modelUrl = 'https://api.deepinfra.com/v1/openai/chat/completions';
        this.modelName = process.env.DEEPINFRA_MODEL || 'deepseek-ai/DeepSeek-V3';
    }

    extractJSON(text) {
        try {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start === -1 || end === -1) throw new Error("No se encontró estructura JSON");
            const jsonString = text.substring(start, end + 1);
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("[IA Error] Fallo al extraer JSON:", text);
            throw new Error("La IA no devolvió un formato válido.");
        }
    }

    injectVariables(template, variables) {
        if (!template) return '';
        let compiled = template;
        for (const [key, value] of Object.entries(variables)) {
            const safeValue = value !== undefined && value !== null ? value : '';
            const regex = new RegExp(`{{${key}}}`, 'g');
            compiled = compiled.replace(regex, safeValue);
        }
        // Limpieza de etiquetas no usadas
        return compiled.replace(/{{[A-Z0-9_]+}}/g, '');
    }

    async orquestarDisenoWeb(siteId, userPrompt) {
        console.log(`[IA Orquestador] 🧠 Iniciando Motor de Variancia Infinita para Site: ${siteId}`);
        
        try {
            const site = await Site.findById(siteId);
            if (!site) throw new Error("Sitio no encontrado en la base de datos.");

            // =========================================================
            // EL PROMPT MAESTRO: CREADOR DE TAILWIND INFINITO
            // =========================================================
            const systemPrompt = `
Eres un Arquitecto de Software de Élite y Experto en UI/UX.
Tu misión es generar sitios web ÚNICOS para la plataforma Wuepy.
NO USES PLANTILLAS PREESTABLECIDAS. Cada sitio debe tener una estructura, diseño, grid y layout radicalmente diferente (ej. a veces menú lateral, a veces centrado, a veces hero partido, asimetrías, glassmorphism, brutalism, minimalismo, etc). Genera el HTML completo usando Tailwind CSS.

Tienes DOS tareas obligatorias que devolver en un solo JSON:

1. EXTRACCIÓN DE DATOS (BD):
Lee la idea del cliente. Si menciona la historia de su empresa, su objetivo, o textos específicos, extráelos y redacta versiones hiper-persuasivas y profesionales para guardarlas en la base de datos ("heroTitle", "heroSubtitle", "aboutText").

2. CREACIÓN DE CÓDIGO HTML (VARIACIONES INFINITAS):
Crea el código HTML desde <html lang="es"> hasta </html>.
REGLAS ESTRICTAS PARA EL HTML:
- DEBE ser único, innovador, usando Tailwind CSS (flex, grid, absolute, transform, etc).
- ESTÁ PROHIBIDO ESCRIBIR TEXTO ESTÁTICO EN EL HTML. Todo texto debe ser una variable exacta que nosotros reemplazaremos. Usa ESTAS variables:
  {{SITE_NAME}}, {{HERO_TITLE}}, {{HERO_SUBTITLE}}, {{ABOUT_TEXT}}, {{WHATSAPP}}, {{EMAIL}}, {{ADDRESS}}
- IMÁGENES: ESTÁ PROHIBIDO USAR FOTOS RARAS. Usa el servicio Pollinations AI para generar fotos espectaculares. El formato es: https://image.pollinations.ai/prompt/{descripcion-detallada-en-ingles-separada-por-guiones}?width=1200&height=800&nologo=true
- PRODUCTOS: ESTÁ PROHIBIDO crear tarjetas de productos (ni de prueba ni falsos). En la sección donde deberían ir los productos, SOLO debes escribir este contenedor exacto: <div id="wuepy-dynamic-products" class="w-full"></div> (El backend inyectará los productos ahí).
- ENLACES: Crea una barra de navegación que lleve a "index.html" y a "nosotros.html".

ESTRUCTURA EXACTA DEL JSON QUE DEBES DEVOLVER:
{
  "extracted_data": {
    "heroTitle": "Título persuasivo basado en el prompt",
    "heroSubtitle": "Subtítulo llamativo",
    "aboutText": "Historia/Misión del negocio redactada para la página de nosotros"
  },
  "theme": {
    "PRIMARY_COLOR": "#hex",
    "SECONDARY_COLOR": "#hex"
  },
  "pages": [
    {
      "filename": "index.html",
      "htmlContent": "<!DOCTYPE html><html lang='es'>... (tu código Tailwind infinito usando {{VARIABLES}} y el div dinámico de productos) ...</html>"
    },
    {
      "filename": "nosotros.html",
      "htmlContent": "<!DOCTYPE html><html lang='es'>... (tu código para la vista de nosotros) ...</html>"
    }
  ]
}
`;

            const userInstruction = `Crea el sitio para este negocio: "${userPrompt}". 
Sorpréndeme con un diseño Tailwind asombroso y nunca antes visto. Infiere la historia de la empresa y guárdala en "aboutText". Usa Pollinations para las imágenes. NO pongas productos estáticos, usa el div contenedor.`;

            const response = await fetch(this.modelUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userInstruction }
                    ],
                    temperature: 0.8, // Temperatura alta para máxima creatividad y varianza estructural
                    max_tokens: 8000, 
                    response_format: { type: "json_object" } 
                })
            });

            const rawData = await response.json();
            
            if (rawData.error) {
                console.error("[IA Error API]:", rawData.error);
                throw new Error("DeepInfra rechazó la solicitud.");
            }

            const aiResponseText = rawData.choices[0].message.content;
            const blueprint = this.extractJSON(aiResponseText);
            
            // =========================================================
            // PASO 1: GUARDAR LOS DATOS PENSADOS POR LA IA EN LA BD
            // =========================================================
            // La IA extrae e inventa textos geniales, LOS GUARDAMOS REALMENTE EN LA BASE DE DATOS
            // para que el cliente luego pueda ir a configuraciones y verlos/editarlos allí.
            if (blueprint.extracted_data) {
                site.content.heroTitle = site.content.heroTitle || blueprint.extracted_data.heroTitle;
                site.content.heroSubtitle = site.content.heroSubtitle || blueprint.extracted_data.heroSubtitle;
                site.content.aboutText = site.content.aboutText || blueprint.extracted_data.aboutText;
            }
            
            if (blueprint.theme) {
                site.primaryColor = blueprint.theme.PRIMARY_COLOR || site.primaryColor;
                site.secondaryColor = blueprint.theme.SECONDARY_COLOR || site.secondaryColor;
            }

            await site.save(); // Guardamos los textos y colores en BD ANTES de compilar

            // =========================================================
            // PASO 2: INYECCIÓN DESDE LA BASE DE DATOS HACIA EL HTML
            // =========================================================
            // Ahora tomamos la base de datos (con los textos que la IA acaba de aprender/guardar)
            // y los inyectamos en el HTML salvaje que la IA acaba de construir.
            const realSiteData = {
                SITE_NAME: site.name || 'Mi Tienda',
                HERO_TITLE: site.content?.heroTitle || 'Bienvenido a nuestra plataforma',
                HERO_SUBTITLE: site.content?.heroSubtitle || 'La mejor calidad para ti.',
                ABOUT_TEXT: site.content?.aboutText || 'Conoce nuestra historia y nuestra misión.',
                WHATSAPP: site.contact?.whatsapp || 'No especificado',
                EMAIL: site.contact?.email || 'No especificado',
                ADDRESS: site.contact?.address || 'Ubicación no especificada',
                PRIMARY_COLOR: site.primaryColor,
                SECONDARY_COLOR: site.secondaryColor
            };

            const generatedPagesArray = [];

            for (const page of blueprint.pages) {
                // Inyectamos el script de Tailwind si la IA lo olvidó en el Head
                let finalHtml = page.htmlContent;
                if (!finalHtml.includes('cdn.tailwindcss.com')) {
                    finalHtml = finalHtml.replace('</head>', '<script src="https://cdn.tailwindcss.com"></script></head>');
                }

                // Inyectamos las variables de BD
                finalHtml = this.injectVariables(finalHtml, realSiteData);

                generatedPagesArray.push({
                    filename: page.filename,
                    htmlContent: finalHtml
                });
                console.log(`[IA Motor Infinito] Código HTML inyectado y preparado: ${page.filename}`);
            }

            site.aiGeneratedPages = generatedPagesArray; 
            site.designMode = 'ai_generated'; 
            site.aiPrompt = userPrompt;
            await site.save();

            console.log(`[IA Orquestador] 🚀 Arquitectura Infinita ensamblada. BD actualizada. HTML inyectado.`);
            return { success: true, message: 'Web dinámica generada con éxito' };

        } catch (error) {
            console.error(`[IA Orquestador] Falla crítica durante la orquestación infinita:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AgentAiService();