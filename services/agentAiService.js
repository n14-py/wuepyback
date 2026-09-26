// ==========================================================================
// WUEPY.COM - EL CEREBRO ORQUESTADOR IA (DeepSeek V4/V3 via DeepInfra)
// ARQUITECTURA INFINITA V7: LEGO MASTER (ENSAMBLAJE INSTANTÁNEO + SEO + 170M COMBINACIONES)
// ==========================================================================
const path = require('path');
const Site = require('../models/Site');
const aiBlocks = require('./ai/aiBlocks'); // Importamos la Bóveda de Bloques

class AgentAiService {
    constructor() {
        this.apiKey = process.env.DEEPINFRA_API_KEY;
        this.modelUrl = 'https://api.deepinfra.com/v1/openai/chat/completions';
        this.modelName = process.env.DEEPINFRA_MODEL || 'deepseek-ai/DeepSeek-V3';
    }

    // Extractor JSON a prueba de balas
    extractJSON(text) {
        try {
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start === -1 || end === -1) throw new Error("No se encontró estructura JSON");
            const jsonString = text.substring(start, end + 1);
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("[IA Error] Fallo al extraer JSON del Director de Arte:", text);
            throw new Error("La IA no devolvió el formato esperado.");
        }
    }

    // Inyector Nuclear de Variables (Ahora soporta SEO y Tailwind Colors)
    injectVariables(template, variables) {
        if (!template) return '';
        let compiled = template;
        for (const [key, value] of Object.entries(variables)) {
            const safeValue = value !== undefined && value !== null ? value : '';
            // Reemplaza todas las ocurrencias de {{KEY}}
            compiled = compiled.split(`{{${key}}}`).join(safeValue);
        }
        // Limpieza de variables huérfanas que la IA o el bloque no usaron
        return compiled.replace(/{{[A-Z0-9_]+}}/g, '');
    }

    // Seleccionador aleatorio de bloques
    getRandomBlock(blockArray) {
        if (!blockArray || blockArray.length === 0) return '';
        const randomIndex = Math.floor(Math.random() * blockArray.length);
        return blockArray[randomIndex];
    }

    // Motor de Petición IA (Optimizado para Copywriting y Data, no HTML)
    async callAIWithRetry(systemPrompt, userPrompt, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
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
                        temperature: 0.9,
                        max_tokens: 3000, 
                        response_format: { type: "json_object" }
                    })
                });

                const rawData = await response.json();
                if (rawData.error) throw new Error(`API AI Error: ${JSON.stringify(rawData.error)}`);
                if (!rawData.choices || !rawData.choices[0]) throw new Error("La IA devolvió una respuesta vacía.");
                
                return rawData.choices[0].message.content;
            } catch (error) {
                console.warn(`[IA Warning] Fallo en intento ${i + 1} de ${retries}: ${error.message}`);
                if (i === retries - 1) throw error;
                await new Promise(res => setTimeout(res, 1500));
            }
        }
    }

    async orquestarDisenoWeb(siteId, userPrompt) {
        console.log(`[IA Orquestador V7] 🌌 INICIANDO ENSAMBLAJE LEGO MASTER PARA SITE: ${siteId}`);
        const startTime = Date.now();
        
        try {
            const site = await Site.findById(siteId);
            if (!site) throw new Error("Sitio no encontrado en la base de datos.");

            // =========================================================
            // FASE 1: LA IA ACTÚA COMO COPYWRITER Y DIRECTOR DE ARTE (1 Segundo)
            // =========================================================
            console.log(`[IA V7] Consultando al Director de Arte IA para los textos y colores...`);
            
            const systemPrompt = `
Eres un Director de Arte y Copywriter de élite. Un cliente te dará una idea de negocio.
Tu trabajo es crear los textos persuasivos y definir el estilo.
NO ESCRIBAS CÓDIGO HTML. Solo devuelve un objeto JSON estricto con los siguientes datos:
{
  "copy": {
    "heroTitle": "Un título principal masivo y atrapante (Máx 6 palabras)",
    "heroSubtitle": "Un subtítulo persuasivo que invite a comprar (Máx 15 palabras)",
    "aboutText": "Una historia apasionante y corporativa sobre la empresa (Mínimo 60 palabras)"
  },
  "seo": {
    "metaDescription": "Descripción para Google (Máx 150 caracteres)",
    "metaKeywords": "palabra1, palabra2, nicho, negocio, tienda"
  },
    "benefits": ["Beneficio corto 1", "Beneficio corto 2", "Beneficio corto 3"],
  "design": {
    "hexColor": "#4f46e5"
  }
}
`;
            
            const aiResponseText = await this.callAIWithRetry(systemPrompt, `Idea del cliente: "${userPrompt}"`);
            const aiData = this.extractJSON(aiResponseText);

            const chosenColor = (site.primaryColor && String(site.primaryColor).startsWith('#'))
                ? site.primaryColor
                : (aiData.design?.hexColor || '#4f46e5');

            // =========================================================
            // 🔥 SOLUCIÓN CRÍTICA AL BUG DE LA PLANTILLA 1 Y EL COLOR 🔥
            // =========================================================
            // Obligamos a la BD a guardar el color que eligió la IA para que api.js
            // lo herede al renderizar product.html y el catálogo.
            site.primaryColor = chosenColor;
            
            site.content.heroTitle = aiData.copy?.heroTitle || site.content.heroTitle;
            site.content.heroSubtitle = aiData.copy?.heroSubtitle || site.content.heroSubtitle;
            site.content.aboutText = aiData.copy?.aboutText || site.content.aboutText;

            await site.save();

            // =========================================================
            // FASE 2: EL ENSAMBLADOR MATEMÁTICO DE BLOQUES
            // =========================================================
            console.log(`[IA V7] Seleccionando bloques aleatorios de la bóveda (170M combinaciones)...`);

            // Elegimos un Header y un Footer que serán IGUALES para las 5 páginas (Coherencia visual)
            const globalHeader = this.getRandomBlock(aiBlocks.headers);
            const globalFooter = this.getRandomBlock(aiBlocks.footers);

            // Armamos el esqueleto de las 5 páginas usando los bloques
            const pagesConfig = [
                {
                    name: 'index.html',
                    content: this.getRandomBlock(aiBlocks.heroes) +
                        `<section class="w-full py-10 px-4 bg-white border-y border-slate-100"><div class="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 text-center"><div class="p-6 rounded-2xl bg-slate-50"><p class="font-black text-lg">{{BENEFIT_1}}</p></div><div class="p-6 rounded-2xl bg-slate-50"><p class="font-black text-lg">{{BENEFIT_2}}</p></div><div class="p-6 rounded-2xl bg-slate-50"><p class="font-black text-lg">{{BENEFIT_3}}</p></div></div></section>` +
                        this.getRandomBlock(aiBlocks.about) +
                        this.getRandomBlock(aiBlocks.catalogs)
                },
                {
                    name: 'catalogo.html',
                    content: this.getRandomBlock(aiBlocks.catalogs)
                },
                {
                    name: 'nosotros.html',
                    content: this.getRandomBlock(aiBlocks.about)
                },
                {
                    name: 'contacto.html',
                    content: this.getRandomBlock(aiBlocks.contact)
                },
                {
                    name: 'product.html',
                    content: this.getRandomBlock(aiBlocks.productDetail)
                }
            ];

            // =========================================================
            // FASE 3: PREPARACIÓN DE DATOS E INYECCIÓN EXTREMA
            // =========================================================
            console.log(`[IA V7] Inyectando datos reales, SEO y configuración Tailwind...`);
            
            const initial = (site.name || 'W').trim().charAt(0).toUpperCase();
            let finalLogoHtml = '';
            if (site.logoUrl) {
                const fullLogoUrl = site.logoUrl.startsWith('http') || site.logoUrl.startsWith('data:') ? site.logoUrl : `https://wuepy.com/${site.logoUrl}`;
                finalLogoHtml = `<span class="inline-flex items-center gap-3"><img src="${fullLogoUrl}" alt="${site.name}" class="h-12 w-12 rounded-xl object-cover bg-white"><span class="font-black text-xl tracking-tight">{{SITE_NAME}}</span></span>`;
            } else {
                finalLogoHtml = `<span class="inline-flex items-center gap-3"><span class="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white font-black text-xl" style="background:${chosenColor}">${initial}</span><span class="font-black text-xl tracking-tight">{{SITE_NAME}}</span></span>`;
            }
            const benefits = (aiData.benefits || ['Atención por WhatsApp', 'Envíos en Paraguay', 'Stock real']).slice(0, 3);

            const realSiteData = {
                SITE_NAME: site.name || 'Mi Tienda',
                HERO_TITLE: site.content?.heroTitle || 'Bienvenido',
                HERO_SUBTITLE: site.content?.heroSubtitle || 'La mejor calidad, a un clic.',
                ABOUT_TEXT: site.content?.aboutText || 'Nuestra misión es la excelencia.',
                WHATSAPP: require('../utils/storeRules').normalizeWhatsapp(site.contact?.whatsapp) || '595900000000',
                EMAIL: site.contact?.email || 'No especificado',
                ADDRESS: site.contact?.address || 'Ubicación no especificada',
                PRIMARY_COLOR: 'brand',
                BENEFIT_1: benefits[0] || 'Atención por WhatsApp',
                BENEFIT_2: benefits[1] || 'Envíos en Paraguay',
                BENEFIT_3: benefits[2] || 'Stock real',
                LOGO_URL: finalLogoHtml
            };

            const generatedPagesArray = [];

            // El Blindaje HTML Maestro (SEO + Fuentes + Tailwind Config)
            const htmlSkeletonBase = `<!DOCTYPE html>
<html lang="es" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{SITE_NAME}} - Tienda Oficial</title>
    
    <meta name="description" content="${aiData.seo?.metaDescription || 'Tienda oficial creada con Wuepy.'}">
    <meta name="keywords" content="${aiData.seo?.metaKeywords || 'tienda, ecommerce, productos'}">
    <meta name="author" content="{{SITE_NAME}}">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config={theme:{extend:{colors:{brand:'${chosenColor}'}}}}</script>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    
    <style>
        [x-cloak] { display: none !important; }
        body { 
            font-family: 'Inter', sans-serif; 
            display: flex; 
            flex-direction: column; 
            min-height: 100vh;
            overflow-x: hidden;
            margin: 0;
            padding: 0;
        }
        .font-serif { font-family: 'Playfair Display', serif; }
        main { flex: 1 0 auto; width: 100%; }
        footer { flex-shrink: 0; width: 100%; }
        
        /* Efectos globales para catálogos Wuepy */
        .wuepy-product-card { transition: all 0.3s ease; }
        .wuepy-product-card:hover { transform: translateY(-8px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased selection:bg-${chosenColor} selection:text-white">
    {{HEADER_BLOCK}}
    
    <main class="w-full flex flex-col">
        {{CONTENT_BLOCK}}
    </main>

    {{FOOTER_BLOCK}}
    <a href="https://wa.me/{{WHATSAPP}}" target="_blank" class="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full bg-emerald-500 text-white shadow-2xl flex items-center justify-center text-3xl" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
</body>
</html>`;

            // Construimos las 5 páginas inyectando los bloques en el esqueleto
            for (const page of pagesConfig) {
                let rawHtml = htmlSkeletonBase
                    .replace('{{HEADER_BLOCK}}', globalHeader)
                    .replace('{{CONTENT_BLOCK}}', page.content)
                    .replace('{{FOOTER_BLOCK}}', globalFooter);

                // Reemplazo del título dinámico en el `<title>` según la página
                let pageTitle = page.name === 'index.html' ? 'Inicio' : page.name.replace('.html', '');
                pageTitle = pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1);
                rawHtml = rawHtml.replace('Tienda Oficial', pageTitle);

                // Pasamos todo por el inyector maestro (Variables, Colores, Textos)
                const finalHtml = this.injectVariables(rawHtml, realSiteData);

                generatedPagesArray.push({
                    filename: page.name,
                    htmlContent: finalHtml
                });
            }

            // =========================================================
            // FASE 4: GUARDADO Y FINALIZACIÓN
            // =========================================================
            site.aiGeneratedPages = generatedPagesArray; 
            site.designMode = 'ai_generated'; 
            site.aiPrompt = userPrompt;
            await site.save();

            const endTime = Date.now();
            console.log(`[IA Orquestador V7] 🏆 OPERACIÓN ÉPICA COMPLETADA EN ${(endTime - startTime) / 1000} SEGUNDOS.`);
            console.log(`[IA Orquestador V7] 🚀 Páginas generadas con Tailwind Color: ${chosenColor}`);

            return { success: true, message: 'Arquitectura Perfecta generada y guardada con éxito al instante.' };

        } catch (error) {
            console.error(`[IA Orquestador V7] ❌ Catástrofe Total en la generación:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AgentAiService();