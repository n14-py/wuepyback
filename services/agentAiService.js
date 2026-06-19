// ==========================================================================
// WUEPY AI - ORQUESTADOR DE DISEÑO Y GENERACIÓN DE CONTENIDO
// ==========================================================================

const Site = require('../models/Site');
const Product = require('../models/Product');
// const { GoogleGenerativeAI } = require("@google/genai"); // Descomenta cuando uses el SDK oficial

module.exports = {
    /**
     * orquestarDisenoWeb
     * Toma el ID de una tienda recién creada y un prompt del usuario.
     * Utiliza IA para generar textos persuasivos, elegir una paleta de colores
     * y poblar el inventario inicial con productos relevantes al nicho.
     */
    orquestarDisenoWeb: async (siteId, prompt) => {
        try {
            console.log(`[Wuepy AI] Iniciando orquestación para la tienda ID: ${siteId}`);
            console.log(`[Wuepy AI] Prompt del usuario: "${prompt}"`);

            const site = await Site.findById(siteId);
            if (!site) {
                throw new Error('La tienda no existe en la base de datos.');
            }

            // ==========================================================
            // 1. LLAMADA A LA INTELIGENCIA ARTIFICIAL (GEMINI / OPENAI)
            // ==========================================================
            // Aquí iría tu llamada real a la API. 
            // Para evitar que tu server crashee mientras configuras tus API Keys,
            // usaremos una estructura de datos simulada y robusta que imita la respuesta de la IA.
            
            /* EJEMPLO DE LLAMADA REAL A GEMINI:
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", response_format: { type: "json_object" } });
            const aiPrompt = `Actúa como un experto en e-commerce. Crea los datos para una tienda basada en esto: "${prompt}". Devuelve un JSON con heroTitle, heroSubtitle, aboutText, primaryColor (hex), secondaryColor (hex), y un array de 4 'products' (con name, category, price, description).`;
            const result = await model.generateContent(aiPrompt);
            const aiData = JSON.parse(result.response.text());
            */

            // SIMULACIÓN DE RESPUESTA DE LA IA BASADA EN EL PROMPT
            // (La IA detecta automáticamente el nicho del usuario)
            let isTech = prompt.toLowerCase().includes('tecnologia') || prompt.toLowerCase().includes('celulares');
            let isClothing = prompt.toLowerCase().includes('ropa') || prompt.toLowerCase().includes('moda');
            
            const aiData = {
                heroTitle: isTech ? 'La mejor tecnología a tu alcance' : (isClothing ? 'Viste con estilo y actitud' : 'Los mejores productos, a un clic'),
                heroSubtitle: isTech ? 'Equipos de última generación con garantía.' : (isClothing ? 'Colección exclusiva para la temporada.' : 'Descubre nuestra selección exclusiva.'),
                aboutText: `Nuestra misión es ofrecerte calidad y confianza. Nacimos de la idea de transformar el mercado basándonos en: ${prompt}.`,
                primaryColor: isTech ? '#2563eb' : (isClothing ? '#db2777' : '#4f46e5'),
                secondaryColor: '#0f172a',
                products: [
                    {
                        name: isTech ? 'Auriculares Inalámbricos Pro' : (isClothing ? 'Remera Oversize Premium' : 'Producto Estrella 1'),
                        category: isTech ? 'Accesorios' : (isClothing ? 'Remeras' : 'General'),
                        price: 150000,
                        description: 'Calidad superior, diseño moderno y durabilidad garantizada. Ideal para el uso diario.'
                    },
                    {
                        name: isTech ? 'Smartwatch Serie 8' : (isClothing ? 'Pantalón Cargo Urbano' : 'Producto Estrella 2'),
                        category: isTech ? 'Relojes' : (isClothing ? 'Pantalones' : 'General'),
                        price: 250000,
                        description: 'El complemento perfecto que no puede faltar. Materiales premium.'
                    },
                    {
                        name: isTech ? 'Cargador Carga Rápida 20W' : (isClothing ? 'Hoodie Minimalista' : 'Producto Estrella 3'),
                        category: isTech ? 'Accesorios' : (isClothing ? 'Abrigos' : 'General'),
                        price: 85000,
                        description: 'Eficiencia y diseño en un solo paquete. Compra segura.'
                    }
                ]
            };

            // ==========================================================
            // 2. ACTUALIZAR LA TIENDA CON EL DISEÑO DE LA IA
            // ==========================================================
            site.content.heroTitle = aiData.heroTitle;
            site.content.heroSubtitle = aiData.heroSubtitle;
            site.content.aboutText = aiData.aboutText;
            site.primaryColor = aiData.primaryColor;
            site.secondaryColor = aiData.secondaryColor;
            
            await site.save();
            console.log(`[Wuepy AI] Textos y colores guardados con éxito en la tienda.`);

            // ==========================================================
            // 3. POBLAR EL INVENTARIO CON LOS PRODUCTOS GENERADOS
            // ==========================================================
            if (aiData.products && aiData.products.length > 0) {
                const initialProducts = aiData.products.map(p => ({
                    site: site._id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    stock: 10, // Stock base para que puedan empezar a vender o usar el POS
                    category: p.category,
                    isActive: true,
                    showInGlobalMarketplace: true
                }));

                await Product.insertMany(initialProducts);
                console.log(`[Wuepy AI] Inventario inicial poblado con ${initialProducts.length} productos.`);
            }

            return { success: true, message: 'Orquestación completada' };

        } catch (error) {
            console.error('[Wuepy AI] Error crítico durante la orquestación:', error);
            return { success: false, error: error.message };
        }
    }
};