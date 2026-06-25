// ==========================================================================
// WUEPY.COM - EL CEREBRO ORQUESTADOR IA (DeepSeek V4/V3 via DeepInfra)
// ARQUITECTURA BLUEPRINT: La IA diseña el JSON, Node.js ensambla los bloques.
// ==========================================================================
const path = require('path');
const Site = require('../models/Site');
const aiBlocks = require('./ai/aiBlocks'); // Nuestra bóveda de componentes

class AgentAiService {
    constructor() {
        this.apiKey = process.env.DEEPINFRA_API_KEY;
        this.modelUrl = 'https://api.deepinfra.com/v1/openai/chat/completions';
        // Usamos el modelo más rápido y potente que configuraste
        this.modelName = process.env.DEEPINFRA_MODEL || 'deepseek-ai/DeepSeek-V3';
    }

    // Función auxiliar para extraer JSON puro si la IA decide agregar texto extra o Markdown
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

    // Función que inyecta variables como {{TITULO}} en el texto del bloque
    injectVariables(template, variables) {
        if (!template) return '';
        let compiled = template;
        
        // Iterar el objeto para reemplazar variables
        for (const [key, value] of Object.entries(variables)) {
            // Reemplaza globalmente todas las coincidencias de {{VARIABLE}}
            const regex = new RegExp(`{{${key}}}`, 'g');
            compiled = compiled.replace(regex, value);
        }
        return compiled;
    }

    async orquestarDisenoWeb(siteId, userPrompt) {
        console.log(`[IA Orquestador] 🧠 Iniciando análisis y arquitectura para Site: ${siteId}`);
        
        try {
            const site = await Site.findById(siteId);
            if (!site) throw new Error("Sitio no encontrado en la base de datos.");

            // =========================================================
            // 1. EXTRAER INVENTARIO DE BLOQUES PARA LA IA
            // =========================================================
            // Le pasamos a la IA la lista de piezas que tenemos en la bóveda
            // para que ella sepa qué puede elegir. BLINDADO contra undefined.
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
            // 2. EL PROMPT MAESTRO (EL CEREBRO ARQUITECTO)
            // =========================================================
            const systemPrompt = `
Eres el "Arquitecto IA Master" de Wuepy, experto en UX/UI, marketing digital y e-commerce.
Tu misión no es escribir HTML directamente, sino diseñar un "Blueprint" (plano en formato JSON) de un sitio web completo multi-página basándote en la idea del cliente.

INSTRUCCIONES ESTRICTAS:
1. DEBES DEVOLVER ÚNICAMENTE UN OBJETO JSON VÁLIDO. Ni una palabra más. Sin explicaciones.
2. Analiza el nicho del negocio del cliente y decide la paleta de colores (en HEX), la tipografía y los textos persuasivos.
3. Debes crear al menos 3 páginas si aplica: "index.html" (Inicio), "nosotros.html" (Historia/Misión) y "contacto.html" o "faq.html".
4. Para cada página, elige los bloques disponibles que mejor encajen y proporciona los textos para sus variables.

BLOQUES DISPONIBLES EN LA BÓVEDA:
- Navs: ${availableNavs}
- Heros: ${availableHeros}
- Products: ${availableProducts} (ÚSALO SOLO EN EL INDEX.HTML)
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
    "BG_COLOR": "#ffffff o #0f172a (según el tono)",
    "TEXT_COLOR": "#1e293b o #f8fafc",
    "FONT_FAMILY": "Inter, Roboto, Poppins, etc"
  },
  "global_vars": {
    "SITE_NAME": "Nombre de la tienda (invéntalo si no lo dice)",
    "SITE_INITIAL": "Inicial del nombre",
    "SITE_DESCRIPTION": "Breve descripción SEO"
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
            "HERO_TITLE": "Título persuasivo",
            "HERO_SUBTITLE": "Subtítulo llamativo",
            "HERO_CTA1": "Ver Catálogo",
            "HERO_CTA2": "Conócenos",
            "IMAGE_KEYWORD": "palabra clave en inglés para Unsplash ej: makeup, cars, clothes"
          }
        },
        {
          "type": "products",
          "name": "modern_grid",
          "content": {
            "CATALOG_TITLE": "Nuestros Productos",
            "CATALOG_SUBTITLE": "Lo mejor de lo mejor"
          }
        }
      ],
      "footer": "modern_dark",
      "footer_content": {
        "FOOTER_ABOUT": "Texto sobre la empresa en el footer",
        "FOOTER_ADDRESS": "Ciudad, País",
        "FOOTER_HOURS": "Lunes a Sábado 08:00 - 18:00"
      }
    }
  ]
}

REGLAS DE ORO:
- INVENTA textos profesionales y persuasivos (Copywriting nivel experto).
- Adapta los keywords de Unsplash al nicho (ej. si es repuestos, usa "car,engine").
- Asegúrate de que las variables en "content" cubran todas las necesidades lógicas del bloque.
`;

            const userInstruction = `Requerimiento del cliente: "${userPrompt}". 
Crea la estructura JSON completa, con colores que encajen con este rubro, crea el index.html y al menos un nosotros.html. Sé creativo con el Copywriting.`;

            // =========================================================
            // 3. LLAMADA DEEPINFRA (Alta velocidad y bajo costo)
            // =========================================================
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
                    temperature: 0.7,
                    max_tokens: 4000, 
                    // Si DeepInfra soporta response_format para JSON lo forzamos
                    response_format: { type: "json_object" } 
                })
            });

            const rawData = await response.json();
            
            if (rawData.error) {
                console.error("[IA Error API]:", rawData.error);
                throw new Error("DeepInfra rechazó la solicitud.");
            }

            const aiResponseText = rawData.choices[0].message.content;
            
            // =========================================================
            // 4. PARSEO DEL BLUEPRINT (El plano del arquitecto)
            // =========================================================
            const blueprint = this.extractJSON(aiResponseText);
            console.log(`[IA Orquestador] Blueprint generado exitosamente. Páginas a crear: ${blueprint.pages.length}`);

            // Combinamos las variables globales (colores, fuentes, nombre) para inyectarlas en todas partes
            const globalVariables = { ...blueprint.theme, ...blueprint.global_vars };

            // NUEVO: Array para almacenar las páginas en memoria y luego guardarlas en la BD
            const generatedPagesArray = [];

            // =========================================================
            // 5. EL COMPILADOR (El Constructor Node.js)
            // =========================================================
            for (const page of blueprint.pages) {
                let pageHtml = aiBlocks?.base?.layout || '<html><body>{{NAV_BLOCK}}{{BODY_BLOCKS}}{{FOOTER_BLOCK}}</body></html>'; // Toma el esqueleto base con fallback
                
                // 5.1. Construir el Nav
                const navTemplate = (aiBlocks?.navs && aiBlocks.navs[page.nav]) ? aiBlocks.navs[page.nav] : (aiBlocks?.navs?.['modern_glass'] || '');
                pageHtml = pageHtml.replace('{{NAV_BLOCK}}', navTemplate);

                // 5.2. Construir el Footer
                const footerTemplate = (aiBlocks?.footers && aiBlocks.footers[page.footer]) ? aiBlocks.footers[page.footer] : (aiBlocks?.footers?.['modern_dark'] || '');
                const footerCompiled = this.injectVariables(footerTemplate, page.footer_content || {});
                pageHtml = pageHtml.replace('{{FOOTER_BLOCK}}', footerCompiled);

                // 5.3. Ensamblar el Body (Cuerpo de la página)
                let bodyHtml = '';
                if (page.blocks && page.blocks.length > 0) {
                    for (const block of page.blocks) {
                        // Verifica si el bloque existe en nuestra bóveda
                        if (aiBlocks?.[block.type] && aiBlocks[block.type][block.name]) {
                            const rawBlockHtml = aiBlocks[block.type][block.name];
                            // Inyecta los textos persuasivos redactados por DeepSeek
                            const compiledBlock = this.injectVariables(rawBlockHtml, block.content || {});
                            bodyHtml += compiledBlock + '\n';
                        } else {
                            console.warn(`[IA Advertencia] La IA intentó usar un bloque inexistente: ${block.type}.${block.name}`);
                        }
                    }
                }
                pageHtml = pageHtml.replace('{{BODY_BLOCKS}}', bodyHtml);

                // 5.4. Inyectar variables globales y variables de página en TODO el HTML
                const pageSpecificVariables = { ...globalVariables, PAGE_TITLE: page.PAGE_TITLE || 'Página' };
                pageHtml = this.injectVariables(pageHtml, pageSpecificVariables);

                // 5.5. Limpieza final: Eliminar cualquier {{VARIABLE}} que la IA olvidó llenar
                pageHtml = pageHtml.replace(/{{[A-Z0-9_]+}}/g, '');

                // 5.6. NUEVO: Guardar en el array para inyectarlo en la base de datos (ya no en archivo físico)
                generatedPagesArray.push({
                    filename: page.filename,
                    htmlContent: pageHtml
                });
                console.log(`[IA Compilador] Código HTML preparado para la BD: ${page.filename}`);
            }

            // =========================================================
            // 6. ACTUALIZAR BASE DE DATOS
            // =========================================================
            site.aiGeneratedPages = generatedPagesArray; // Asignamos todo el HTML a la BD
            site.designMode = 'ai_generated'; // Marca que fue hecho por la IA
            site.aiPrompt = userPrompt;
            site.customHtmlFolder = ''; // Dejamos vacío por retrocompatibilidad, ya no se usa carpeta
            await site.save();

            console.log(`[IA Orquestador] 🚀 Construcción completada al 100% y guardada en BD para Site: ${siteId}`);
            
            return { success: true, message: 'Web ensamblada y guardada directamente en la base de datos' };

        } catch (error) {
            console.error(`[IA Orquestador] Falla crítica durante la orquestación:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AgentAiService();