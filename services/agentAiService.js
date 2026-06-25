// ==========================================================================
// WUEPY.COM - EL CEREBRO ORQUESTADOR IA (DeepSeek V4/V3 via DeepInfra)
// ARQUITECTURA INFINITA V6: MODO DIOS TITANIO (SECUENCIAL + REINTENTOS + FALLBACKS)
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
            throw new Error("La IA no devolvió un formato JSON válido.");
        }
    }

    extractHTML(text) {
        if (!text.includes('```')) return text.trim();
        const parts = text.split('```');
        if (parts.length >= 3) {
            let htmlPart = parts[1];
            if (htmlPart.toLowerCase().startsWith('html')) {
                htmlPart = htmlPart.substring(4);
            }
            return htmlPart.trim();
        }
        return text.trim();
    }

    injectVariables(template, variables) {
        if (!template) return '';
        let compiled = template;
        for (const [key, value] of Object.entries(variables)) {
            const safeValue = value !== undefined && value !== null ? value : '';
            compiled = compiled.split(`{{${key}}}`).join(safeValue);
        }
        return compiled.replace(/{{[A-Z0-9_]+}}/g, '');
    }

    // Llamada base a la IA
    async callAI(systemPrompt, userPrompt, useJson = false) {
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
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.8,
                max_tokens: 8000,
                ...(useJson && { response_format: { type: "json_object" } })
            })
        });

        const rawData = await response.json();
        if (rawData.error) throw new Error(`API AI Error: ${JSON.stringify(rawData.error)}`);
        if (!rawData.choices || !rawData.choices[0]) throw new Error("La IA devolvió una respuesta vacía.");
        return rawData.choices[0].message.content;
    }

    // SISTEMA DE REINTENTOS (NUEVO BLINDAJE): Intenta 3 veces si la API de DeepSeek falla
    async callAIWithRetry(systemPrompt, userPrompt, useJson = false, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.callAI(systemPrompt, userPrompt, useJson);
            } catch (error) {
                console.warn(`[IA Warning] Fallo en intento ${i + 1} de ${retries}: ${error.message}`);
                if (i === retries - 1) {
                    console.error("[IA Fatal] Se agotaron los reintentos.");
                    throw error;
                }
                // Espera 2 segundos antes de reintentar
                await new Promise(res => setTimeout(res, 2000));
            }
        }
    }

    // HTML de emergencia por si la IA explota por completo en una página
    getFallbackMain(pageName) {
        console.log(`[IA Rescue] Inyectando Fallback de Emergencia para ${pageName}`);
        if (pageName === 'catalogo.html' || pageName === 'index.html') {
            return `<main class="flex-grow w-full py-20 px-4 max-w-7xl mx-auto"><h2 class="text-4xl font-extrabold text-center mb-10 text-slate-800">Catálogo</h2><div id="wuepy-dynamic-products" class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"></div></main>`;
        }
        if (pageName === 'product.html') {
            return `<main class="flex-grow w-full py-20 px-4 bg-slate-50"><div id="wuepy-dynamic-product-detail" class="w-full max-w-6xl mx-auto min-h-[60vh] bg-white rounded-3xl shadow-2xl p-8 flex items-center justify-center text-slate-500 font-bold">Cargando producto...</div></main>`;
        }
        return `<main class="flex-grow w-full py-20 px-4 max-w-7xl mx-auto"><h1 class="text-3xl font-bold text-center">${pageName.replace('.html', '').toUpperCase()}</h1><p class="text-center mt-4 text-slate-600">Sección en construcción.</p></main>`;
    }

    async orquestarDisenoWeb(siteId, userPrompt) {
        console.log(`[IA Orquestador V6] 🌌 INICIANDO ARQUITECTURA TITANIO PARA SITE: ${siteId}`);
        
        try {
            const site = await Site.findById(siteId);
            if (!site) throw new Error("Sitio no encontrado en la base de datos.");

            console.log(`[IA V6] Fase 1: Creación del Blueprint Maestro (Header, Footer, Colores)...`);
            
            const blueprintSystemPrompt = `
Eres un Arquitecto de Software Frontend. Tu trabajo es crear la base estructural de un sitio web.
MANDAMIENTOS:
1. HEADER: OBLIGATORIO tener un menú hamburguesa funcional para móviles usando AlpineJS (x-data, x-show). Enlaces obligatorios: Inicio (/index.html), Catálogo (/catalogo.html), Nosotros (/nosotros.html), Contacto (/contacto.html). Usa clases Tailwind.
2. FOOTER: Masivo, moderno, con 3-4 columnas, enlaces rápidos, redes sociales y contacto. Fondo oscuro.
3. ESTILOS: Usa Tailwind CSS. PROHIBIDO usar URLs de imágenes. Usa divs estilizados como placeholders.

Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta:
{
  "theme": { "PRIMARY_COLOR": "clase-tailwind-bg", "TEXT_COLOR": "clase-tailwind-text" },
  "data": { "heroTitle": "Título impactante", "heroSubtitle": "Subtítulo persuasivo", "aboutText": "Texto largo sobre la empresa" },
  "header_html": "<header class='w-full'>...código tailwind y alpine...</header>",
  "footer_html": "<footer class='w-full'>...código tailwind...</footer>"
}
`;
            // Usamos el callAIWithRetry para asegurar que el Blueprint no falle
            const blueprintResponse = await this.callAIWithRetry(blueprintSystemPrompt, `Idea de negocio: "${userPrompt}"`, true, 3);
            const blueprint = this.extractJSON(blueprintResponse);

            site.content.heroTitle = blueprint.data.heroTitle || site.content.heroTitle;
            site.content.heroSubtitle = blueprint.data.heroSubtitle || site.content.heroSubtitle;
            site.content.aboutText = blueprint.data.aboutText || site.content.aboutText;
            site.primaryColor = site.primaryColor || '#000000';
            await site.save();

            const pagesToGenerate = [
                { name: 'index.html', desc: 'Landing page con Hero impactante (min-h-[80vh]), beneficios y una sección para destacar productos.' },
                { name: 'catalogo.html', desc: 'Página exclusiva para el inventario de productos. Agrega filtros visuales (categorías) de adorno y un contenedor gigante.' },
                { name: 'nosotros.html', desc: 'Página sobre la historia del negocio, misión, visión. Usa columnas flex para no romper en móvil.' },
                { name: 'contacto.html', desc: 'Tarjetas de información (WhatsApp, Email, Dirección) y formulario de contacto espectacular.' },
                { name: 'product.html', desc: 'Plantilla base de producto individual. Diseño dividido: Espacio de imagen a la izquierda, título, precio y botón comprar a la derecha.' }
            ];

            const generatedPagesArray = [];
            let contextoAcumulado = `Idea de negocio: ${userPrompt}. Blueprint inicial creado. Estilo moderno y limpio.`;

            const pageSystemPrompt = `
Eres un Experto Desarrollador Frontend UI/UX. Tu objetivo es generar ÚNICAMENTE la etiqueta <main> y su contenido interno para una página específica.
REGLAS ESTRICTAS DE SUPERVIVENCIA (ANTI-ROTURAS CSS):
1. RESPONSIVE Y SCROLL SEGURO: Prohibido usar "h-screen" en cajas de texto. Usa SIEMPRE "min-h-[80vh]", "py-20" o "py-32". Deja que el contenido decida la altura. Para columnas usa "flex flex-col lg:flex-row".
2. CERO IMÁGENES EXTERNAS: Usa placeholders hermosos con Tailwind (divs grises con bordes redondeados). NUNCA uses "src='http...'".
3. VARIABLES: Usa estrictamente {{SITE_NAME}}, {{HERO_TITLE}}, {{HERO_SUBTITLE}}, {{ABOUT_TEXT}}, {{WHATSAPP}}, {{EMAIL}}, {{ADDRESS}}.
4. OUTPUT: Devuelve SOLO el HTML dentro de <main>. Ni HTML, ni head, ni body.

REGLAS CRÍTICAS DE INYECCIÓN WUEPY (DE VIDA O MUERTE):
- Si generas "index.html" o "catalogo.html", INYECTA ESTE DIV VACÍO DONDE DEBAN IR LOS PRODUCTOS: <div id="wuepy-dynamic-products" class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-10"></div>
- Si generas "product.html", INYECTA ESTE DIV VACÍO DONDE DEBE IR EL DETALLE DEL PRODUCTO: <div id="wuepy-dynamic-product-detail" class="w-full max-w-7xl mx-auto min-h-[60vh] py-10"></div>
`;

            for (const page of pagesToGenerate) {
                console.log(`[IA V6] 🛠️ Forjando página de forma individual: ${page.name}...`);
                const userInstruct = `Contexto: ${contextoAcumulado}. Tarea: Genera el <main> para "${page.name}". Descripción: ${page.desc}. Regla: Solo HTML crudo.`;

                let mainHtml = '';
                try {
                    // LLamada a la IA con 3 reintentos
                    const pageRaw = await this.callAIWithRetry(pageSystemPrompt, userInstruct, false, 3);
                    mainHtml = this.extractHTML(pageRaw);
                } catch (err) {
                    console.error(`[IA Error] Fallo irreversible al generar ${page.name}. Aplicando Fallback de emergencia.`);
                    mainHtml = this.getFallbackMain(page.name);
                }

                // 🔥 DOBLE VALIDACIÓN: Si la IA hizo el HTML pero olvidó el ID, lo forzamos.
                if ((page.name === 'index.html' || page.name === 'catalogo.html') && !mainHtml.includes('wuepy-dynamic-products')) {
                    console.log(`[IA Seguridad] Inyectando catálogo dinámico forzoso en ${page.name}...`);
                    mainHtml += `<section class="py-16 px-4 max-w-7xl mx-auto"><h2 class="text-4xl font-bold mb-10 text-center">Nuestro Catálogo</h2><div id="wuepy-dynamic-products" class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"></div></section>`;
                }
                
                if (page.name === 'product.html' && !mainHtml.includes('wuepy-dynamic-product-detail')) {
                    console.log(`[IA Seguridad] Inyectando detalle de producto forzoso en ${page.name}...`);
                    mainHtml = `<main class="flex-grow w-full py-20 px-4 bg-slate-50"><div id="wuepy-dynamic-product-detail" class="w-full max-w-7xl mx-auto min-h-[60vh] bg-white rounded-3xl shadow-xl p-6 lg:p-12"></div></main>`;
                }

                // Validamos que esté envuelto en <main> para que el layout flex no se rompa
                if (!mainHtml.startsWith('<main')) {
                    mainHtml = `<main class="flex-grow w-full flex flex-col">${mainHtml}</main>`;
                }

                // ENSAMBLAJE DE LA PÁGINA INDIVIDUAL CON SUS META TAGS, HEADER Y FOOTER
                const ensambladoFinal = `<!DOCTYPE html>
<html lang="es" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{SITE_NAME}} - ${page.name.replace('.html', '').toUpperCase()}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        [x-cloak] { display: none !important; }
        /* CSS BLINDADO: Garantiza que el footer quede abajo y la página ocupe el 100% */
        html, body { overflow-x: hidden; width: 100%; min-height: 100vh; margin: 0; padding: 0; }
        body { display: flex; flex-direction: column; }
        main { flex: 1 0 auto; width: 100%; }
        footer { flex-shrink: 0; width: 100%; }
        /* Mejora visual de las transiciones */
        .wuepy-card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .wuepy-card-hover:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
    ${blueprint.header_html}
    ${mainHtml}
    ${blueprint.footer_html}
</body>
</html>`;

                generatedPagesArray.push({
                    filename: page.name,
                    htmlContent: ensambladoFinal
                });

                // Le damos pistas a la IA de lo que ya hizo para mantener coherencia de diseño
                contextoAcumulado += ` [Página ${page.name} procesada correctamente]`;
            }

            console.log(`[IA V6] Fase 3: Inyectando Base de Datos Real en los templates...`);
            
            let finalLogoHtml = '';
            if (site.logoUrl) {
                const baseUrl = process.env.NODE_ENV === 'production' ? 'https://wuepy.com' : 'http://localhost:3000';
                const fullLogoUrl = site.logoUrl.startsWith('http') ? site.logoUrl : `${baseUrl}/${site.logoUrl}`;
                finalLogoHtml = `<img src="${fullLogoUrl}" alt="${site.name}" class="h-12 w-auto object-contain">`;
            } else {
                finalLogoHtml = `<span class="font-black text-2xl tracking-tighter text-blue-600">{{SITE_NAME}}</span>`;
            }

            const realSiteData = {
                SITE_NAME: site.name || 'Mi Tienda',
                HERO_TITLE: site.content?.heroTitle || 'Bienvenido a nuestra plataforma',
                HERO_SUBTITLE: site.content?.heroSubtitle || 'La mejor calidad, a un clic.',
                ABOUT_TEXT: site.content?.aboutText || 'Nuestra misión es la excelencia y satisfacción de nuestros clientes.',
                WHATSAPP: site.contact?.whatsapp || 'No especificado',
                EMAIL: site.contact?.email || 'No especificado',
                ADDRESS: site.contact?.address || 'Ubicación no especificada',
                LOGO_URL: finalLogoHtml
            };

            // Inyectar la data y dejar el código limpio
            const cleanPagesArray = generatedPagesArray.map(p => ({
                filename: p.filename,
                htmlContent: this.injectVariables(p.htmlContent, realSiteData)
            }));

            // Guardado final en la base de datos
            site.aiGeneratedPages = cleanPagesArray; 
            site.designMode = 'ai_generated'; 
            site.aiPrompt = userPrompt;
            await site.save();

            console.log(`[IA Orquestador V6] 🏆 OPERACIÓN ÉPICA COMPLETADA. ${cleanPagesArray.length} Páginas generadas y aseguradas.`);
            return { success: true, message: 'Arquitectura Perfecta generada y guardada con éxito.' };

        } catch (error) {
            console.error(`[IA Orquestador V6] ❌ Catástrofe Total en la generación:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AgentAiService();