// ==========================================================================
// WUEPY.COM - BÓVEDA DE COMPONENTES IA (EL ARSENAL DEFINITIVO)
// ==========================================================================
// Cientos de piezas de alta conversión. DeepSeek elegirá las mejores
// y reemplazará las variables {{VARIABLES}} para crear webs únicas.

module.exports = {
    // ==========================================
    // 1. ESTRUCTURAS BASE MAESTRAS
    // ==========================================
    base: {
        // Layout para la página principal (con carga de catálogo)
        layout: `<!DOCTYPE html>
<html lang="es" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{SITE_NAME}} | {{PAGE_TITLE}}</title>
    <meta name="description" content="{{SITE_DESCRIPTION}}">
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.12.0/dist/cdn.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family={{FONT_FAMILY}}:wght@300;400;600;800;900&display=swap" rel="stylesheet">
    <script src="/js/api.js"></script>
    <style>
        :root { --brand-color: {{PRIMARY_COLOR}}; --brand-dark: {{SECONDARY_COLOR}}; }
        body { font-family: '{{FONT_FAMILY}}', sans-serif; background-color: {{BG_COLOR}}; color: {{TEXT_COLOR}}; }
        .text-brand { color: var(--brand-color); }
        .bg-brand { background-color: var(--brand-color); }
        .border-brand { border-color: var(--brand-color); }
        .hover-bg-brand:hover { background-color: var(--brand-color); filter: brightness(1.1); }
        [x-cloak] { display: none !important; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--brand-color); border-radius: 4px; }
    </style>
</head>
<body x-data="storefrontApp()" x-cloak class="antialiased flex flex-col min-h-screen">
    
    {{NAV_BLOCK}}

    <main class="flex-grow">
        {{BODY_BLOCKS}}
    </main>

    {{FOOTER_BLOCK}}

    <script>
        document.addEventListener('alpine:init', () => {
            Alpine.data('storefrontApp', () => ({
                site: null, products: [], isLoading: true,
                async init() {
                    try {
                        const hostname = window.location.hostname;
                        const subdomain = (hostname === 'localhost' || hostname === '127.0.0.1') ? 'demo' : hostname.split('.')[0];
                        const res = await fetch((window.API_URL || 'https://wuepyback.onrender.com/api') + '/store/public/' + subdomain + '?_t=' + Date.now());
                        const data = await res.json();
                        if (data.success) { this.site = data.site; this.products = data.products || []; }
                    } catch (e) { console.error(e); }
                    this.isLoading = false;
                },
                formatMoney(amount) { return (this.site?.currency === 'PYG' ? 'Gs. ' : '$ ') + parseInt(amount || 0).toLocaleString('es-PY'); }
            }));
        });
    </script>
</body>
</html>`
    },

    // ==========================================
    // 2. NAVEGADORES (HEADERS)
    // ==========================================
    navs: {
        modern_glass: `
        <nav class="fixed w-full z-50 top-0 transition-all duration-300 backdrop-blur-xl bg-[{{BG_COLOR}}]/80 border-b border-gray-200/10 shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" x-data="{ mobileMenuOpen: false }">
                <div class="flex justify-between items-center h-20">
                    <a href="index.html" class="flex items-center gap-3 group">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg transform group-hover:rotate-12 transition" style="background-color: {{PRIMARY_COLOR}};">{{SITE_INITIAL}}</div>
                        <span class="text-2xl font-black tracking-tight" style="color: {{TEXT_COLOR}}">{{SITE_NAME}}</span>
                    </a>
                    <div class="hidden md:flex gap-8 items-center font-bold text-sm">
                        <a href="index.html" class="opacity-70 hover:opacity-100 hover:text-brand transition">Inicio</a>
                        <a href="index.html#catalogo" class="opacity-70 hover:opacity-100 hover:text-brand transition">Catálogo</a>
                        <a href="nosotros.html" class="opacity-70 hover:opacity-100 hover:text-brand transition">Nuestra Historia</a>
                        <a href="contacto.html" class="opacity-70 hover:opacity-100 hover:text-brand transition">Contacto</a>
                    </div>
                    <a :href="'https://wa.me/' + (site?.whatsappNumber || '').replace(/[^0-9]/g, '')" target="_blank" class="hidden sm:flex bg-brand text-white px-6 py-2.5 rounded-full font-black shadow-lg hover:scale-105 transition items-center gap-2">
                        <i class="fab fa-whatsapp text-xl"></i> Chat
                    </a>
                    <button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden text-2xl"><i class="fas fa-bars"></i></button>
                </div>
                <div x-show="mobileMenuOpen" class="md:hidden absolute top-20 left-0 w-full bg-[{{BG_COLOR}}] border-b shadow-2xl pb-6 px-4 flex flex-col gap-4 font-bold text-lg z-50">
                    <a href="index.html" class="pt-4 border-t border-gray-200/10">Inicio</a>
                    <a href="index.html#catalogo">Catálogo</a>
                    <a href="nosotros.html">Historia</a>
                    <a href="contacto.html">Contacto</a>
                </div>
            </div>
        </nav>
        <div class="h-20"></div>`,
    },

    // ==========================================
    // 3. HEROS (PORTADAS PRINCIPALES)
    // ==========================================
    heros: {
        bold_centered: `
        <section class="relative py-32 overflow-hidden flex items-center justify-center min-h-[70vh]">
            <div class="absolute inset-0 z-0">
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-[120px] pointer-events-none" style="background-color: {{PRIMARY_COLOR}};"></div>
            </div>
            <div class="max-w-4xl mx-auto px-4 text-center relative z-10">
                <span class="inline-block py-1.5 px-4 rounded-full text-xs font-black uppercase tracking-widest mb-6 border bg-opacity-10" style="color: {{PRIMARY_COLOR}}; border-color: {{PRIMARY_COLOR}}; background-color: {{PRIMARY_COLOR}}20;">{{HERO_BADGE}}</span>
                <h1 class="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tighter">{{HERO_TITLE}}</h1>
                <p class="text-xl md:text-2xl mb-12 opacity-80 max-w-2xl mx-auto">{{HERO_SUBTITLE}}</p>
                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <a href="index.html#catalogo" class="px-8 py-4 rounded-xl font-black text-lg transition transform hover:-translate-y-1 text-white shadow-xl shadow-brand/30" style="background-color: {{PRIMARY_COLOR}};">{{HERO_CTA1}} <i class="fas fa-arrow-right ml-2"></i></a>
                    <a href="nosotros.html" class="px-8 py-4 rounded-xl font-black text-lg transition border-2 hover:bg-opacity-10" style="border-color: {{SECONDARY_COLOR}}40; color: {{TEXT_COLOR}};">{{HERO_CTA2}}</a>
                </div>
            </div>
        </section>`,

        split_image: `
        <section class="relative pt-20 pb-32 lg:pt-32 overflow-hidden">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div class="relative z-10">
                    <div class="w-16 h-2 mb-8 rounded-full" style="background-color: {{PRIMARY_COLOR}};"></div>
                    <h1 class="text-5xl md:text-7xl font-black mb-6 leading-none tracking-tight">{{HERO_TITLE}}</h1>
                    <p class="text-xl opacity-80 mb-10 leading-relaxed max-w-lg">{{HERO_SUBTITLE}}</p>
                    <a href="index.html#catalogo" class="inline-flex items-center gap-3 px-8 py-4 rounded-full font-black text-white shadow-xl transition hover:scale-105" style="background-color: {{PRIMARY_COLOR}};">
                        {{HERO_CTA1}} <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><i class="fas fa-shopping-bag"></i></div>
                    </a>
                </div>
                <div class="relative">
                    <div class="absolute inset-0 transform translate-x-6 translate-y-6 rounded-3xl" style="background-color: {{PRIMARY_COLOR}}; opacity: 0.2;"></div>
                    <img src="https://source.unsplash.com/800x1000/?{{IMAGE_KEYWORD}}" alt="Hero" class="relative rounded-3xl shadow-2xl object-cover h-[600px] w-full transform hover:-translate-y-2 transition duration-500">
                </div>
            </div>
        </section>`
    },

    // ==========================================
    // 4. GRILLAS DE PRODUCTOS (MOTOR WUEPY)
    // ==========================================
    products: {
        modern_grid: `
        <section id="catalogo" class="py-24" style="background-color: {{SECONDARY_COLOR}}03;">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div>
                        <h2 class="text-4xl md:text-5xl font-black mb-4">{{CATALOG_TITLE}}</h2>
                        <p class="text-lg opacity-70 max-w-xl">{{CATALOG_SUBTITLE}}</p>
                    </div>
                </div>
                
                <template x-if="products.length === 0 && !isLoading">
                    <div class="text-center py-20 border-2 border-dashed border-gray-300 rounded-3xl opacity-50">
                        <i class="fas fa-box-open text-6xl mb-4"></i>
                        <p class="text-xl font-bold">Catálogo en preparación...</p>
                    </div>
                </template>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    <template x-for="product in products" :key="product._id">
                        <div class="group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition duration-500 bg-white" style="border: 1px solid {{SECONDARY_COLOR}}15;">
                            <div class="aspect-[4/5] overflow-hidden relative bg-gray-50">
                                <img :src="product.imageUrl || 'https://placehold.co/600x800?text=Sin+Imagen'" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-700">
                                
                                <template x-if="product.compareAtPrice > product.price">
                                    <div class="absolute top-4 left-4 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Oferta</div>
                                </template>
                                <template x-if="product.stock <= 0">
                                    <div class="absolute top-4 right-4 bg-black text-white text-xs font-black px-3 py-1.5 rounded-full uppercase shadow-lg">Agotado</div>
                                </template>
                            </div>
                            <div class="p-6">
                                <p class="text-[10px] font-black uppercase tracking-widest mb-2 opacity-50" x-text="product.category || 'Destacado'"></p>
                                <h3 class="text-lg font-bold mb-3 line-clamp-2 text-gray-900 group-hover:text-brand transition" x-text="product.name"></h3>
                                
                                <div class="flex items-center gap-3 mb-6">
                                    <p class="text-2xl font-black" style="color: {{PRIMARY_COLOR}}" x-text="formatMoney(product.price)"></p>
                                    <template x-if="product.compareAtPrice > product.price">
                                        <p class="text-sm font-bold text-gray-400 line-through" x-text="formatMoney(product.compareAtPrice)"></p>
                                    </template>
                                </div>
                                
                                <a :href="'https://wa.me/' + (site?.whatsappNumber || '').replace(/[^0-9]/g, '') + '?text=Hola! Quiero comprar: ' + product.name" target="_blank" class="w-full block text-center py-3.5 rounded-xl font-black text-white transition transform active:scale-95 shadow-md hover:shadow-xl" style="background-color: {{PRIMARY_COLOR}};">
                                    <i class="fab fa-whatsapp mr-1"></i> Pedir Ahora
                                </a>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </section>`
    },

    // ==========================================
    // 5. SOBRE NOSOTROS / HISTORIA (NUEVO)
    // ==========================================
    about: {
        story_split: `
        <section class="py-24 overflow-hidden relative">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div class="relative order-2 lg:order-1">
                        <div class="grid grid-cols-2 gap-4">
                            <img src="https://source.unsplash.com/600x800/?{{ABOUT_IMAGE1}}" class="rounded-3xl shadow-xl transform translate-y-8">
                            <img src="https://source.unsplash.com/600x800/?{{ABOUT_IMAGE2}}" class="rounded-3xl shadow-xl">
                        </div>
                        <div class="absolute -bottom-10 -left-10 w-40 h-40 rounded-full border-8 opacity-20 pointer-events-none" style="border-color: {{PRIMARY_COLOR}};"></div>
                    </div>
                    <div class="order-1 lg:order-2">
                        <span class="text-brand font-black tracking-widest uppercase text-sm mb-4 block">{{ABOUT_EYEBROW}}</span>
                        <h2 class="text-4xl md:text-6xl font-black mb-8 leading-tight">{{ABOUT_TITLE}}</h2>
                        <div class="space-y-6 text-lg opacity-80 leading-relaxed">
                            <p>{{ABOUT_PARAGRAPH_1}}</p>
                            <p>{{ABOUT_PARAGRAPH_2}}</p>
                        </div>
                        <div class="mt-12 grid grid-cols-2 gap-8 pt-10 border-t border-gray-200/20">
                            <div>
                                <h4 class="text-4xl font-black mb-2" style="color: {{PRIMARY_COLOR}}">{{ABOUT_STAT1_NUM}}</h4>
                                <p class="font-bold opacity-70 uppercase tracking-widest text-xs">{{ABOUT_STAT1_TEXT}}</p>
                            </div>
                            <div>
                                <h4 class="text-4xl font-black mb-2" style="color: {{PRIMARY_COLOR}}">{{ABOUT_STAT2_NUM}}</h4>
                                <p class="font-bold opacity-70 uppercase tracking-widest text-xs">{{ABOUT_STAT2_TEXT}}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`
    },

    // ==========================================
    // 6. TESTIMONIOS (SOCIAL PROOF) (NUEVO)
    // ==========================================
    testimonials: {
        grid: `
        <section class="py-24" style="background-color: {{SECONDARY_COLOR}};">
            <div class="max-w-7xl mx-auto px-4 text-white">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-black mb-4">{{TESTIMONIAL_TITLE}}</h2>
                    <p class="opacity-70 text-lg">{{TESTIMONIAL_SUBTITLE}}</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div class="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition">
                        <div class="flex text-yellow-400 mb-6 text-xl"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                        <p class="text-lg mb-8 opacity-90 leading-relaxed">"{{REVIEW1_TEXT}}"</p>
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-gray-500 flex items-center justify-center font-bold text-xl">{{REVIEW1_INITIAL}}</div>
                            <div>
                                <h4 class="font-bold">{{REVIEW1_NAME}}</h4>
                                <span class="text-xs opacity-50 uppercase tracking-widest">Cliente Verificado</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition transform md:-translate-y-4">
                        <div class="flex text-yellow-400 mb-6 text-xl"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i></div>
                        <p class="text-lg mb-8 opacity-90 leading-relaxed">"{{REVIEW2_TEXT}}"</p>
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-brand flex items-center justify-center font-bold text-xl">{{REVIEW2_INITIAL}}</div>
                            <div>
                                <h4 class="font-bold">{{REVIEW2_NAME}}</h4>
                                <span class="text-xs opacity-50 uppercase tracking-widest">Cliente Fiel</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition">
                        <div class="flex text-yellow-400 mb-6 text-xl"><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i></div>
                        <p class="text-lg mb-8 opacity-90 leading-relaxed">"{{REVIEW3_TEXT}}"</p>
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center font-bold text-xl">{{REVIEW3_INITIAL}}</div>
                            <div>
                                <h4 class="font-bold">{{REVIEW3_NAME}}</h4>
                                <span class="text-xs opacity-50 uppercase tracking-widest">Cliente Verificado</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`
    },

    // ==========================================
    // 7. PREGUNTAS FRECUENTES (FAQ) (NUEVO)
    // ==========================================
    faq: {
        accordion: `
        <section class="py-24">
            <div class="max-w-4xl mx-auto px-4">
                <div class="text-center mb-16">
                    <h2 class="text-4xl font-black mb-4">{{FAQ_TITLE}}</h2>
                    <p class="opacity-70 text-lg">{{FAQ_SUBTITLE}}</p>
                </div>
                
                <div class="space-y-4" x-data="{ active: null }">
                    <div class="border border-gray-200/50 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <button @click="active !== 1 ? active = 1 : active = null" class="w-full px-6 py-5 text-left font-bold text-lg flex justify-between items-center hover:bg-gray-50 transition text-gray-900">
                            {{FAQ1_QUESTION}}
                            <i class="fas fa-chevron-down transition-transform duration-300" :class="active === 1 ? 'rotate-180 text-brand' : ''"></i>
                        </button>
                        <div x-show="active === 1" x-collapse class="px-6 pb-6 text-gray-600 leading-relaxed">{{FAQ1_ANSWER}}</div>
                    </div>
                    <div class="border border-gray-200/50 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <button @click="active !== 2 ? active = 2 : active = null" class="w-full px-6 py-5 text-left font-bold text-lg flex justify-between items-center hover:bg-gray-50 transition text-gray-900">
                            {{FAQ2_QUESTION}}
                            <i class="fas fa-chevron-down transition-transform duration-300" :class="active === 2 ? 'rotate-180 text-brand' : ''"></i>
                        </button>
                        <div x-show="active === 2" x-collapse class="px-6 pb-6 text-gray-600 leading-relaxed">{{FAQ2_ANSWER}}</div>
                    </div>
                    <div class="border border-gray-200/50 rounded-2xl overflow-hidden bg-white shadow-sm">
                        <button @click="active !== 3 ? active = 3 : active = null" class="w-full px-6 py-5 text-left font-bold text-lg flex justify-between items-center hover:bg-gray-50 transition text-gray-900">
                            {{FAQ3_QUESTION}}
                            <i class="fas fa-chevron-down transition-transform duration-300" :class="active === 3 ? 'rotate-180 text-brand' : ''"></i>
                        </button>
                        <div x-show="active === 3" x-collapse class="px-6 pb-6 text-gray-600 leading-relaxed">{{FAQ3_ANSWER}}</div>
                    </div>
                </div>
            </div>
        </section>`
    },

    // ==========================================
    // 8. BANNER CTA (LLAMADO A LA ACCIÓN) (NUEVO)
    // ==========================================
    cta: {
        banner: `
        <section class="py-12 px-4">
            <div class="max-w-7xl mx-auto rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl" style="background-color: {{PRIMARY_COLOR}};">
                <div class="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div class="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                <div class="relative z-10">
                    <h2 class="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">{{CTA_TITLE}}</h2>
                    <p class="text-xl text-white/80 mb-10 max-w-2xl mx-auto">{{CTA_SUBTITLE}}</p>
                    <a href="index.html#catalogo" class="inline-block bg-white text-gray-900 px-10 py-5 rounded-full font-black text-lg shadow-xl hover:scale-105 transition transform">{{CTA_BUTTON}}</a>
                </div>
            </div>
        </section>`
    },

    // ==========================================
    // 9. FOOTERS (PIE DE PÁGINA)
    // ==========================================
    footers: {
        modern_dark: `
        <footer class="pt-20 pb-10 text-white mt-auto" style="background-color: {{SECONDARY_COLOR}};">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    <div class="lg:col-span-2">
                        <h2 class="text-4xl font-black mb-6">{{SITE_NAME}}</h2>
                        <p class="opacity-60 max-w-sm text-lg leading-relaxed mb-8">{{FOOTER_ABOUT}}</p>
                        <div class="flex gap-4">
                            <a href="#" class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand transition text-xl"><i class="fab fa-instagram"></i></a>
                            <a href="#" class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand transition text-xl"><i class="fab fa-facebook-f"></i></a>
                            <a href="#" class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand transition text-xl"><i class="fab fa-tiktok"></i></a>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-bold uppercase tracking-widest mb-6" style="color: {{PRIMARY_COLOR}};">Navegación</h4>
                        <ul class="space-y-4 font-semibold opacity-80">
                            <li><a href="index.html" class="hover:text-brand transition">Inicio</a></li>
                            <li><a href="index.html#catalogo" class="hover:text-brand transition">Tienda Online</a></li>
                            <li><a href="nosotros.html" class="hover:text-brand transition">Nuestra Historia</a></li>
                            <li><a href="faq.html" class="hover:text-brand transition">Ayuda / FAQ</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold uppercase tracking-widest mb-6" style="color: {{PRIMARY_COLOR}};">Atención al Cliente</h4>
                        <ul class="space-y-4 font-semibold opacity-80">
                            <li class="flex items-center gap-3"><i class="fas fa-map-marker-alt text-brand"></i> {{FOOTER_ADDRESS}}</li>
                            <li class="flex items-center gap-3"><i class="fab fa-whatsapp text-brand text-lg"></i> <span x-text="site?.whatsappNumber || 'Consulte vía web'"></span></li>
                            <li class="flex items-center gap-3"><i class="far fa-clock text-brand"></i> {{FOOTER_HOURS}}</li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-50 font-bold">
                    <p>&copy; <span x-text="new Date().getFullYear()"></span> {{SITE_NAME}}. Todos los derechos reservados.</p>
                    <p>Creado con <i class="fas fa-bolt text-brand mx-1"></i> Inteligencia Artificial de Wuepy</p>
                </div>
            </div>
        </footer>`
    }
};