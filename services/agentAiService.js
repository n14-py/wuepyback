// ==========================================================================
// WUEPY.COM - EL CEREBRO ORQUESTADOR IA (DeepSeek V4/V3 via DeepInfra)
// ARQUITECTURA INFINITA V4: MODO DIOS X100 (MULTIPÁGINA + ANTI-BREAK + MEGA FOOTER)
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
        console.log(`[IA Orquestador] 🌌 DESATANDO MODO DIOS X100 PARA SITE: ${siteId}`);
        
        try {
            const site = await Site.findById(siteId);
            if (!site) throw new Error("Sitio no encontrado en la base de datos.");

            // =========================================================
            // EL PROMPT MAESTRO V4: LA BIBLIA ABSOLUTA DEL DISEÑO UI/UX
            // =========================================================
            const systemPrompt = `
Eres el Diseñador y Desarrollador Frontend más cotizado del mundo, ganador de múltiples premios Awwwards.
Tu misión es diseñar sitios web ABSOLUTAMENTE ÉPICOS, ÚNICOS, PERFECTOS y COMPLETAMENTE FUNCIONALES con Tailwind CSS.

MANDAMIENTOS DE ARQUITECTURA RESPONSIVE (ANTI-ROTURAS - OBLIGATORIO):
1. EL ESQUELETO DE TITANIO: TODAS las secciones (<section>, <header>, <footer>) deben usar la clase 'w-full'. PERO su contenido interno DEBE ESTAR OBLIGATORIAMENTE DENTRO DE ESTE CONTENEDOR:
   <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> [CONTENIDO AQUÍ] </div>
2. ANTI-CORTES DE TEXTO (CRÍTICO): JAMÁS uses alturas fijas destructivas como 'h-screen' o 'h-96' en contenedores con mucho texto. Para secciones divididas (imagen/texto), usa SIEMPRE: 'flex flex-col lg:flex-row items-center gap-12 py-20 lg:py-32'. El 'items-center' y los paddings 'py' garantizan que el texto nunca se suba ni se corte. Deja que el contenido dicte la altura.
3. MOBILE-FIRST EXTREMO: Todo diseño empieza para celular. NUNCA asumas pantallas grandes por defecto.
4. ANTI-DESBORDAMIENTO: El <body> debe tener SIEMPRE las clases: 'font-sans antialiased overflow-x-hidden'.

MANDAMIENTOS DE DISEÑO Y ESTRUCTURA (LA EXPERIENCIA PREMIUM):
1. NAV/HEADER: Debe ser moderno, sticky (fijo al hacer scroll), con enlaces a las 4 páginas generadas. Usa la variable {{LOGO_URL}} si existe, si no, usa un texto estilizado con {{SITE_NAME}}.
2. FOOTER MONUMENTAL (CRÍTICO): ESTÁ ESTRICTAMENTE PROHIBIDO HACER UN FOOTER BÁSICO. Tu footer debe ser una obra de arte masiva. Debe contener mínimo 4 columnas: (1) Logo y bio, (2) Enlaces rápidos, (3) Contacto con iconos, (4) Un formulario de Newsletter hermoso. Usa fondos oscuros ('bg-slate-950') o cristalinos para contrastar con el resto de la web.
3. IMÁGENES: Usa la API de Pollinations. Ej: https://image.pollinations.ai/prompt/cyberpunk-neon-store-interior?width=1200&height=800&nologo=true. Crea prompts en inglés hiper-detallados, fotorealistas, 8k, cinematográficos. NADA de imágenes aburridas.

MANDAMIENTOS MULTIPÁGINA (DEBES GENERAR ESTAS 4 PÁGINAS SÍ O SÍ):
1. index.html: Hero impactante (min-h-[80vh] flex items-center), Bento Grid de beneficios, y EXACTAMENTE ESTA LÍNEA para el catálogo:
   <div id="wuepy-dynamic-products" class="w-full py-10"></div>
2. nosotros.html: Hero propio. Sección de "Nuestra Historia" a dos columnas (usando 'items-center' para no cortar texto) con {{ABOUT_TEXT}}. Equipo o Valores.
3. contacto.html: Diseño espectacular con información de contacto ({{WHATSAPP}}, {{EMAIL}}, {{ADDRESS}}) en tarjetas interactivas y un formulario de contacto visualmente increíble.
4. product.html (CRÍTICO PARA QUE NO SE VEA PANTALLA NEGRA): Esta es la plantilla maestra para ver un solo producto. Debe tener el header y footer, y en el medio EXACTAMENTE ESTE CONTENEDOR:
   <div id="wuepy-dynamic-product-detail" class="w-full min-h-[70vh] py-20"></div>

RULETA DE ESTILOS (Elige UNA estética al azar y aplícala de forma extrema en las 4 páginas):
- ESTILO 1: "Vercel Dark Mode". 'bg-slate-950 text-white', luces difuminadas de fondo ('blur-3xl bg-blue-500/20'), botones brillantes.
- ESTILO 2: "Apple Clean Minimalist". 'bg-slate-50', tipografía gruesa, muchísimo espacio ('py-32'), bordes muy redondeados ('rounded-[3rem]'), sombras súper suaves.
- ESTILO 3: "Neo-Brutalism". Colores saturados, bordes negros gruesos ('border-4 border-black'), sombras duras sin difuminar, tipografías monoespaciadas.

VARIABLES OBLIGATORIAS (Úsalas en todo el HTML):
{{SITE_NAME}}, {{HERO_TITLE}}, {{HERO_SUBTITLE}}, {{ABOUT_TEXT}}, {{WHATSAPP}}, {{EMAIL}}, {{ADDRESS}}, {{LOGO_URL}}

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
    { "filename": "index.html", "htmlContent": "<!DOCTYPE html>..." },
    { "filename": "nosotros.html", "htmlContent": "<!DOCTYPE html>..." },
    { "filename": "contacto.html", "htmlContent": "<!DOCTYPE html>..." },
    { "filename": "product.html", "htmlContent": "<!DOCTYPE html>..." }
  ]
}
`;

            const userInstruction = `Requerimiento del cliente: "${userPrompt}". 
Aplica todo tu conocimiento de diseño UI/UX. Recuerda usar 'items-center' para que los textos no se corten. Genera el Footer más épico que puedas imaginar. Y asegúrate de crear el product.html con el id 'wuepy-dynamic-product-detail'. ¡CONSTRUYE EL SITIO DEFINITIVO!`;

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
                    max_tokens: 16000, // Aumentamos para soportar 4 páginas complejas sin cortes
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
            // Lógica para mostrar logo real o dejar vacío si no hay
            let finalLogoHtml = '';
            if (site.logoUrl) {
                // Asumiendo que logoUrl viene como un path relativo guardado en R2/Cloudinary/Local
                const baseUrl = process.env.NODE_ENV === 'production' ? 'https://wuepy.com' : 'http://localhost:3000';
                const fullLogoUrl = site.logoUrl.startsWith('http') ? site.logoUrl : `${baseUrl}/${site.logoUrl}`;
                finalLogoHtml = `<img src="${fullLogoUrl}" alt="${site.name}" class="h-12 w-auto object-contain">`;
            } else {
                finalLogoHtml = `<span class="font-extrabold text-2xl tracking-tighter">${site.name}</span>`;
            }

            const realSiteData = {
                SITE_NAME: site.name || 'Mi Tienda',
                HERO_TITLE: site.content?.heroTitle || 'Bienvenido a nuestra plataforma',
                HERO_SUBTITLE: site.content?.heroSubtitle || 'La mejor calidad para ti.',
                ABOUT_TEXT: site.content?.aboutText || 'Conoce nuestra historia y nuestra misión.',
                WHATSAPP: site.contact?.whatsapp || 'No especificado',
                EMAIL: site.contact?.email || 'No especificado',
                ADDRESS: site.contact?.address || 'Ubicación no especificada',
                PRIMARY_COLOR: site.primaryColor,
                SECONDARY_COLOR: site.secondaryColor,
                LOGO_URL: finalLogoHtml // Se inyecta la etiqueta img o el texto directamente
            };

            const generatedPagesArray = [];

            for (const page of blueprint.pages) {
                let finalHtml = page.htmlContent;
                
                // 1. BLINDAJE DEL HEAD: Aseguramos Tailwind, FontAwesome y AlpineJS
                if (!finalHtml.includes('cdn.tailwindcss.com')) {
                    finalHtml = finalHtml.replace('</head>', '<script src="https://cdn.tailwindcss.com"></script></head>');
                }
                if (!finalHtml.includes('font-awesome')) {
                    finalHtml = finalHtml.replace('</head>', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></head>');
                }
                if (!finalHtml.includes('alpinejs')) {
                    finalHtml = finalHtml.replace('</head>', '<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script></head>');
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
                console.log(`[IA Motor Infinito X100] Vista épica renderizada: ${page.filename}`);
            }

            site.aiGeneratedPages = generatedPagesArray; 
            site.designMode = 'ai_generated'; 
            site.aiPrompt = userPrompt;
            await site.save();

            console.log(`[IA Orquestador] 🏆 Operación "Modo Dios V4" completada. Multipágina y Mega Footer listos.`);
            return { success: true, message: 'Arquitectura Premium generada con éxito' };

        } catch (error) {
            console.error(`[IA Orquestador] Catástrofe en la generación X100:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AgentAiService();