// ==========================================================================
// WUEPY.COM - EL CEREBRO ORQUESTADOR IA (DeepSeek V4/V3 via DeepInfra)
// ARQUITECTURA INFINITA V3: MODO DIOS X10 (AWWWARDS EDITION + RESPONSIVE BLINDADO)
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
            console.error("[IA Error] Fallo al extraer JSON de la Matrix:", text);
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
        // Limpieza nuclear de etiquetas no utilizadas
        return compiled.replace(/{{[A-Z0-9_]+}}/g, '');
    }

    async orquestarDisenoWeb(siteId, userPrompt) {
        console.log(`[IA Orquestador] 🌌 DESATANDO MODO DIOS X10 PARA SITE: ${siteId}`);
        
        try {
            const site = await Site.findById(siteId);
            if (!site) throw new Error("Sitio no encontrado en la base de datos.");

            // =========================================================
            // EL PROMPT MAESTRO V3: LA BIBLIA DEL DISEÑO UI/UX
            // =========================================================
            const systemPrompt = `
Eres el Diseñador Frontend más cotizado del mundo, ganador de 50 premios Awwwards.
Tu misión es diseñar sitios web ABSOLUTAMENTE ÉPICOS, ÚNICOS Y PERFECTOS con Tailwind CSS.

MANDAMIENTOS DE ARQUITECTURA RESPONSIVE (SI FALLAS, EL SITIO SE ROMPE):
1. EL ESQUELETO DE TITANIO: TODAS las secciones (<section>, <header>, <footer>) deben usar la clase 'w-full'. PERO su contenido interno DEBE ESTAR OBLIGATORIAMENTE DENTRO DE ESTE CONTENEDOR EXACTO:
   <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> [CONTENIDO AQUÍ] </div>
2. MOBILE-FIRST EXTREMO: Todo diseño empieza para celular. Usa 'flex flex-col md:flex-row' o 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'. NUNCA asumas pantallas grandes por defecto.
3. ANTI-DESBORDAMIENTO: El <body> debe tener SIEMPRE las clases: 'font-sans antialiased overflow-x-hidden text-slate-800 bg-slate-50'. (O sus equivalentes en Dark Mode).
4. TEXTOS DINÁMICOS: Los títulos nunca deben ser fijos. Usa: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black'.

RULETA DE ESTILOS (Elige UNA de estas personalidades al azar para que NUNCA hayan dos webs iguales):
- ESTILO 1: "Vercel Dark Mode". Fondos negros ('bg-slate-950'), bordes sutiles ('border border-white/10'), luces difuminadas de fondo, botones brillantes, texto blanco.
- ESTILO 2: "Apple Clean Minimalist". Fondos ultra blancos o gris perla ('bg-slate-50'), tipografía enorme y gruesa, mucho espacio en blanco ('py-24'), bordes muy redondeados ('rounded-[3rem]'), sombras súper suaves ('shadow-2xl shadow-slate-200/50').
- ESTILO 3: "Neo-Brutalism". Colores saturados vibrantes, bordes negros gruesos ('border-4 border-black'), sombras duras sin difuminar ('shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'), tipografías monoespaciadas.
- ESTILO 4: "Glassmorphism & Gradients". Fondos con mallas de colores pastel, tarjetas translúcidas ('bg-white/40 backdrop-blur-xl border border-white/50'), estética muy de belleza o moda.

MANDAMIENTOS DE CONTENIDO Y MULTIPÁGINA:
1. IMÁGENES: Usa la API de Pollinations. Ej: https://image.pollinations.ai/prompt/cyberpunk-neon-store-interior?width=1200&height=800&nologo=true (Usa prompts en inglés hiper-detallados según el rubro del cliente).
2. MENÚ DE NAVEGACIÓN: Debe ser "Sticky" o "Fixed" en el top, con enlaces a "index.html" y "nosotros.html".
3. INDEX.HTML:
   - Debe tener un HERO gigantesco e impactante (Altura mínima 'min-h-[80vh]').
   - Sección de Beneficios o Servicios usando un "Bento Grid" (Cajas asimétricas modernas).
   - LA ZONA DE PRODUCTOS: Debe ser un título increíble seguido EXACTAMENTE POR ESTA LÍNEA (No pongas tarjetas de prueba, solo este div):
     <div id="wuepy-dynamic-products" class="w-full"></div>
   - Un Footer monumental con enlaces, datos de contacto y redes sociales.
4. NOSOTROS.HTML:
   - NO HAGAS UNA PÁGINA SIMPLE.
   - Debe tener un HERO propio espectacular.
   - Una sección tipo "Nuestra Historia" dividida en dos columnas: Una foto gigante y al lado el texto usando {{ABOUT_TEXT}}.
   - Una sección final con una frase inspiradora.

VARIABLES OBLIGATORIAS:
ESTÁ PROHIBIDO ESCRIBIR TEXTO ESTÁTICO PARA DATOS CLAVES. Usa OBLIGATORIAMENTE estas variables en todo el HTML:
{{SITE_NAME}}, {{HERO_TITLE}}, {{HERO_SUBTITLE}}, {{ABOUT_TEXT}}, {{WHATSAPP}}, {{EMAIL}}, {{ADDRESS}}

ESTRUCTURA DEL JSON A DEVOLVER:
{
  "extracted_data": {
    "heroTitle": "Un título maestro brutal basado en el nicho",
    "heroSubtitle": "Subtítulo altamente persuasivo",
    "aboutText": "Una historia profunda, extensa y persuasiva sobre el negocio (Mínimo 50 palabras)."
  },
  "theme": {
    "PRIMARY_COLOR": "#hex",
    "SECONDARY_COLOR": "#hex"
  },
  "pages": [
    {
      "filename": "index.html",
      "htmlContent": "<!DOCTYPE html>..."
    },
    {
      "filename": "nosotros.html",
      "htmlContent": "<!DOCTYPE html>..."
    }
  ]
}
`;

            const userInstruction = `Requerimiento del cliente: "${userPrompt}". 
Destruye cualquier límite. Aplica una de las estéticas de la Ruleta de Estilos al azar. Haz que sea la web más bonita, compleja y responsive que hayas creado en tu vida. Recuerda el <div id="wuepy-dynamic-products"></div> en el index.html. ¡SORPRÉNDEME!`;

            // Aumentamos temperatura para que la IA se ponga altamente creativa
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
                    temperature: 0.9, 
                    max_tokens: 12000, // Máxima capacidad de memoria para HTML extensos
                    response_format: { type: "json_object" } 
                })
            });

            const rawData = await response.json();
            
            if (rawData.error) {
                console.error("[IA Error API]:", rawData.error);
                throw new Error("El clúster de Inteligencia Artificial rechazó la solicitud (Demasiado masivo o error de API).");
            }

            const aiResponseText = rawData.choices[0].message.content;
            const blueprint = this.extractJSON(aiResponseText);
            
            // =========================================================
            // PASO 1: EXTRAER Y GUARDAR INTELIGENCIA EN LA BD
            // =========================================================
            if (blueprint.extracted_data) {
                // Solo guardamos si están vacíos, o si el cliente está forzando una regeneración.
                site.content.heroTitle = blueprint.extracted_data.heroTitle || site.content.heroTitle;
                site.content.heroSubtitle = blueprint.extracted_data.heroSubtitle || site.content.heroSubtitle;
                site.content.aboutText = blueprint.extracted_data.aboutText || site.content.aboutText;
            }
            
            if (blueprint.theme) {
                site.primaryColor = blueprint.theme.PRIMARY_COLOR || site.primaryColor;
                site.secondaryColor = blueprint.theme.SECONDARY_COLOR || site.secondaryColor;
            }

            await site.save(); 

            // =========================================================
            // PASO 2: INYECCIÓN DE DATOS REALES Y BLINDAJE DE HTML
            // =========================================================
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
                let finalHtml = page.htmlContent;
                
                // 1. BLINDAJE DEL HEAD: Aseguramos que tenga Tailwind y FontAwesome sí o sí.
                if (!finalHtml.includes('cdn.tailwindcss.com')) {
                    finalHtml = finalHtml.replace('</head>', '<script src="https://cdn.tailwindcss.com"></script></head>');
                }
                if (!finalHtml.includes('font-awesome')) {
                    finalHtml = finalHtml.replace('</head>', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></head>');
                }

                // 2. INYECCIÓN VARIABLES
                finalHtml = this.injectVariables(finalHtml, realSiteData);

                // 3. PROTECCIÓN FINAL CONTRA OVERFLOW (Seguro de vida en el body)
                if (finalHtml.includes('<body') && !finalHtml.includes('overflow-x-hidden')) {
                     finalHtml = finalHtml.replace('<body class="', '<body class="overflow-x-hidden ');
                     // Fallback por si no puso clases en el body
                     if(!finalHtml.includes('class=')) {
                        finalHtml = finalHtml.replace('<body>', '<body class="overflow-x-hidden">');
                     }
                }

                generatedPagesArray.push({
                    filename: page.filename,
                    htmlContent: finalHtml
                });
                console.log(`[IA Motor Infinito X10] Vista épica renderizada: ${page.filename}`);
            }

            site.aiGeneratedPages = generatedPagesArray; 
            site.designMode = 'ai_generated'; 
            site.aiPrompt = userPrompt;
            await site.save();

            console.log(`[IA Orquestador] 🏆 Operación "Modo Dios" completada con éxito. Sitio 100% responsivo y único.`);
            return { success: true, message: 'Arquitectura Premium generada con éxito' };

        } catch (error) {
            console.error(`[IA Orquestador] Catástrofe en la generación X10:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AgentAiService();