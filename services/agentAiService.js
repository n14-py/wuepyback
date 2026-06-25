// ==========================================================================
// WUEPY.COM - EL CEREBRO ORQUESTADOR IA (DeepSeek V4/V3 via DeepInfra)
// ARQUITECTURA BLUEPRINT: MODO ESQUELETO (Inyección de Datos Reales)
// ==========================================================================
const path = require('path');
const Site = require('../models/Site');
const aiBlocks = require('./ai/aiBlocks'); // Nuestra bóveda de componentes

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
            console.error("[IA Error] Fallo al extraer JSON de la respuesta:", text);
            throw new Error("La IA no devolvió un formato válido.");
        }
    }

    injectVariables(template, variables) {
        if (!template) return '';
        let compiled = template;
        
        for (const [key, value] of Object.entries(variables)) {
            // Reemplaza globalmente todas las coincidencias, manejando undefined o null
            const safeValue = value !== undefined && value !== null ? value : '';
            const regex = new RegExp(`{{${key}}}`, 'g');
            compiled = compiled.replace(regex, safeValue);
        }
        return compiled;
    }

    async orquestarDisenoWeb(siteId, userPrompt) {
        console.log(`[IA Orquestador] 🧠 Iniciando análisis y arquitectura para Site: ${siteId}`);
        
        try {
            const site = await Site.findById(siteId);
            if (!site) throw new Error("Sitio no encontrado en la base de datos.");

            const availableNavs = Object.keys(aiBlocks?.navs || {}).join(', ');
            const availableHeros = Object.keys(aiBlocks?.heros || {}).join(', ');
            const availableProducts = Object.keys(aiBlocks?.products || {}).join(', ');
            const availableFeatures = Object.keys(aiBlocks?.features || {}).join(', ');
            const availableAbout = Object.keys(aiBlocks?.about || {}).join(', ');
            const availableTestimonials = Object.keys(aiBlocks?.testimonials || {}).join(', ');
            const availableFaq = Object.keys(aiBlocks?.faq || {}).join(', ');
            const availableCta = Object.keys(aiBlocks?.cta || {}).join(', ');
            const availableFooters = Object.keys(aiBlocks?.footers || {}).join(', ');

            // =========================================================
            // EL PROMPT MAESTRO (REESCRITO PARA MODO ESQUELETO Y DISEÑO)
            // =========================================================
            const systemPrompt = `
Eres el "Arquitecto IA Master" de Wuepy, experto en UX/UI y diseño de estructuras web.
Tu misión es diseñar un "Blueprint" (plano JSON) para el sitio web del cliente.

REGLAS ESTRICTAS DE SUPERVIVENCIA (MODO ESQUELETO):
1. ERES UN CREADOR DE PLANTILLAS Y DISEÑO, NO DE DATOS FALSOS.
2. PROHIBIDO INVENTAR: No inventes correos electrónicos, ubicaciones, teléfonos ni nombres de empresas. El sistema inyectará los datos reales del usuario de forma automática.
3. PROHIBIDO INVENTAR PRODUCTOS: Si decides usar el bloque de productos, trátalo solo como un contenedor visual (esqueleto). Los productos reales se cargarán dinámicamente desde la base de datos.
4. IMÁGENES EXACTAS: Usa keywords en inglés para Unsplash que sean elegantes, hiper-precisas al nicho y profesionales (ej: "minimalist,coffee", "dark,tech,workspace", "fashion,boutique"). NADA de imágenes raras o abstractas.
5. DEBES DEVOLVER ÚNICAMENTE UN OBJETO JSON VÁLIDO. Cero texto, cero explicaciones.

BLOQUES DISPONIBLES EN LA BÓVEDA:
- Navs: ${availableNavs}
- Heros: ${availableHeros}
- Products: ${availableProducts} (Úsalo solo como contenedor estructural en index.html)
- Features: ${availableFeatures}
- About: ${availableAbout}
- Testimonials: ${availableTestimonials}
- Faq: ${availableFaq}
- Cta: ${availableCta}
- Footers: ${availableFooters}

ESTRUCTURA EXACTA DEL JSON QUE DEBES DEVOLVER:
{
  "theme": {
    "PRIMARY_COLOR": "#codigohex",
    "SECONDARY_COLOR": "#codigohex",
    "BG_COLOR": "#ffffff o #0f172a",
    "TEXT_COLOR": "#1e293b o #f8fafc",
    "FONT_FAMILY": "Inter, Roboto, Poppins, etc"
  },
  "global_vars": {
    "SITE_DESCRIPTION": "Breve descripción persuasiva y genérica sobre el rubro (SEO)"
  },
  "pages": [
    {
      "filename": "index.html",
      "PAGE_TITLE": "Inicio",
      "nav": "modern_glass",
      "blocks": [
        {
          "type": "heros",
          "name": "split_image",
          "content": {
            "HERO_BADGE": "NUEVA COLECCIÓN",
            "HERO_CTA1": "Ver Catálogo",
            "HERO_CTA2": "Conócenos",
            "IMAGE_KEYWORD": "clothing,store"
          }
        }
      ],
      "footer": "modern_dark",
      "footer_content": {}
    },
    {
      "filename": "nosotros.html",
      "PAGE_TITLE": "Nosotros",
      "nav": "modern_glass",
      "blocks": [
        {
          "type": "about",
          "name": "vision_mission",
          "content": {
            "IMAGE_KEYWORD": "team,office"
          }
        }
      ],
      "footer": "modern_dark",
      "footer_content": {}
    }
  ]
}
`;

            const userInstruction = `Requerimiento del cliente: "${userPrompt}". 
Crea la estructura JSON completa (index.html y nosotros.html). Define una paleta de colores profesional. No inventes datos de contacto ni nombres, el servidor Node.js inyectará la información real del cliente.`;

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
                    temperature: 0.4, // Bajamos temperatura para evitar alucinaciones
                    max_tokens: 4000, 
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
            console.log(`[IA Orquestador] Blueprint generado exitosamente. Páginas a crear: ${blueprint.pages.length}`);

            // =========================================================
            // EL COMPILADOR - INYECCIÓN FORZADA DE DATOS REALES (DB)
            // =========================================================
            // Aquí extraemos los datos que el usuario REALMENTE guardó en la base de datos.
            // Esto anula cualquier intento de la IA de inventar correos, nombres o teléfonos.
            const realSiteData = {
                SITE_NAME: site.name || 'Mi Tienda',
                SITE_INITIAL: site.name ? site.name.charAt(0).toUpperCase() : 'W',
                HERO_TITLE: site.content?.heroTitle || site.name,
                HERO_SUBTITLE: site.content?.heroSubtitle || 'Bienvenido a nuestra plataforma',
                ABOUT_TEXT: site.content?.aboutText || 'Conoce más sobre nuestros servicios.',
                FOOTER_ABOUT: site.content?.aboutText || site.name,
                FOOTER_ADDRESS: site.contact?.address || 'Ubicación no especificada',
                FOOTER_HOURS: site.contact?.schedule || 'Horario a convenir',
                CONTACT_EMAIL: site.contact?.email || '',
                CONTACT_WHATSAPP: site.contact?.whatsapp || '',
                CONTACT_PHONE: site.contact?.phone || site.contact?.whatsapp || '',
                FACEBOOK_LINK: site.social?.facebook || '#',
                INSTAGRAM_LINK: site.social?.instagram || '#',
                TIKTOK_LINK: site.social?.tiktok || '#'
            };

            // Fusionamos: 1. Diseño IA (Colores) -> 2. Textos IA -> 3. Datos Reales DB (Sobrescribe todo)
            const globalVariables = { ...blueprint.theme, ...blueprint.global_vars, ...realSiteData };

            const generatedPagesArray = [];

            for (const page of blueprint.pages) {
                let pageHtml = aiBlocks?.base?.layout || '<html><body>{{NAV_BLOCK}}{{BODY_BLOCKS}}{{FOOTER_BLOCK}}</body></html>';
                
                const navTemplate = (aiBlocks?.navs && aiBlocks.navs[page.nav]) ? aiBlocks.navs[page.nav] : (aiBlocks?.navs?.['modern_glass'] || '');
                pageHtml = pageHtml.replace('{{NAV_BLOCK}}', navTemplate);

                const footerTemplate = (aiBlocks?.footers && aiBlocks.footers[page.footer]) ? aiBlocks.footers[page.footer] : (aiBlocks?.footers?.['modern_dark'] || '');
                const footerCompiled = this.injectVariables(footerTemplate, { ...page.footer_content, ...globalVariables });
                pageHtml = pageHtml.replace('{{FOOTER_BLOCK}}', footerCompiled);

                let bodyHtml = '';
                if (page.blocks && page.blocks.length > 0) {
                    for (const block of page.blocks) {
                        if (aiBlocks?.[block.type] && aiBlocks[block.type][block.name]) {
                            const rawBlockHtml = aiBlocks[block.type][block.name];
                            // Inyectamos las variables de la IA combinadas con las Reales
                            const blockVariables = { ...block.content, ...globalVariables };
                            const compiledBlock = this.injectVariables(rawBlockHtml, blockVariables);
                            bodyHtml += compiledBlock + '\n';
                        }
                    }
                }
                pageHtml = pageHtml.replace('{{BODY_BLOCKS}}', bodyHtml);

                const pageSpecificVariables = { ...globalVariables, PAGE_TITLE: page.PAGE_TITLE || 'Página' };
                pageHtml = this.injectVariables(pageHtml, pageSpecificVariables);

                // Limpieza brutal: Eliminar cualquier {{VARIABLE}} huérfana que no se llenó
                pageHtml = pageHtml.replace(/{{[A-Z0-9_]+}}/g, '');

                generatedPagesArray.push({
                    filename: page.filename,
                    htmlContent: pageHtml
                });
                console.log(`[IA Compilador] Código HTML preparado: ${page.filename}`);
            }

            site.aiGeneratedPages = generatedPagesArray; 
            site.designMode = 'ai_generated'; 
            site.aiPrompt = userPrompt;
            await site.save();

            console.log(`[IA Orquestador] 🚀 Construcción completada y blindada con datos reales para Site: ${siteId}`);
            return { success: true, message: 'Web ensamblada' };

        } catch (error) {
            console.error(`[IA Orquestador] Falla crítica durante la orquestación:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AgentAiService();