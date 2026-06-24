// ==========================================================================
// WUEPY.COM - LA BÓVEDA DE COMPONENTES IA (AI BLOCKS)
// Aquí residen todos los bloques HTML que la IA puede elegir para construir.
// Tecnologías embebidas: Tailwind CSS, Alpine.js (Interactividad), FontAwesome.
// ==========================================================================

module.exports = {
    // ----------------------------------------------------------------------
    // 1. BASE LAYOUT (El esqueleto principal de todas las páginas)
    // ----------------------------------------------------------------------
    base: {
        layout: `
<!DOCTYPE html>
<html lang="es" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{PAGE_TITLE}} - {{SITE_NAME}}</title>
    <meta name="description" content="{{SITE_DESCRIPTION}}">
    
    <script src="https://cdn.tailwindcss.com"></script>
    
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <link href="https://fonts.googleapis.com/css2?family={{FONT_FAMILY}}:wght@300;400;600;700;800&display=swap" rel="stylesheet">

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '{{PRIMARY_COLOR}}',
                        secondary: '{{SECONDARY_COLOR}}',
                        dark: '{{BG_COLOR}}',
                        light: '{{TEXT_COLOR}}'
                    },
                    fontFamily: {
                        sans: ['"{{FONT_FAMILY}}"', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    
    <style>
        body { font-family: '{{FONT_FAMILY}}', sans-serif; background-color: {{BG_COLOR}}; color: {{TEXT_COLOR}}; }
        /* Scrollbar personalizada */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: {{PRIMARY_COLOR}}; border-radius: 4px; }
        .glass-effect { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); }
    </style>
</head>
<body class="antialiased flex flex-col min-h-screen">

    {{NAV_BLOCK}}

    <main class="flex-grow">
        {{BODY_BLOCKS}}
    </main>

    {{FOOTER_BLOCK}}

</body>
</html>
        `
    },

    // ----------------------------------------------------------------------
    // 2. NAVEGACIONES (Headers)
    // ----------------------------------------------------------------------
    navs: {
        modern_glass: `
<nav x-data="{ mobileMenuOpen: false, scrolled: false }" 
     @scroll.window="scrolled = (window.pageYOffset > 20)"
     :class="{ 'glass-effect shadow-lg': scrolled, 'bg-transparent': !scrolled }"
     class="fixed w-full z-50 transition-all duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-20">
            <div class="flex-shrink-0 flex items-center gap-3 cursor-pointer" onclick="window.location.href='index.html'">
                <div class="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/30">
                    {{SITE_INITIAL}}
                </div>
                <span class="font-bold text-2xl tracking-tight">{{SITE_NAME}}</span>
            </div>
            
            <div class="hidden md:flex items-center space-x-8">
                <a href="index.html" class="hover:text-primary transition-colors font-medium">Inicio</a>
                <a href="nosotros.html" class="hover:text-primary transition-colors font-medium">Nosotros</a>
                <a href="faq.html" class="hover:text-primary transition-colors font-medium">FAQ</a>
                <a href="contacto.html" class="bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:opacity-90 transition-all shadow-md shadow-primary/20">Contacto</a>
            </div>

            <div class="md:hidden flex items-center">
                <button @click="mobileMenuOpen = !mobileMenuOpen" class="text-2xl focus:outline-none">
                    <i class="fas" :class="mobileMenuOpen ? 'fa-times' : 'fa-bars'"></i>
                </button>
            </div>
        </div>
    </div>

    <div x-show="mobileMenuOpen" 
         x-transition:enter="transition ease-out duration-200"
         x-transition:enter-start="opacity-0 -translate-y-2"
         x-transition:enter-end="opacity-100 translate-y-0"
         class="md:hidden glass-effect border-t border-gray-200/20 absolute w-full">
        <div class="px-4 pt-2 pb-6 space-y-2 flex flex-col">
            <a href="index.html" class="block px-3 py-3 rounded-lg hover:bg-primary/10 font-medium">Inicio</a>
            <a href="nosotros.html" class="block px-3 py-3 rounded-lg hover:bg-primary/10 font-medium">Nosotros</a>
            <a href="faq.html" class="block px-3 py-3 rounded-lg hover:bg-primary/10 font-medium">FAQ</a>
            <a href="contacto.html" class="block px-3 py-3 mt-2 text-center rounded-lg bg-primary text-white font-medium">Contacto</a>
        </div>
    </div>
</nav>
        `
    },

    // ----------------------------------------------------------------------
    // 3. HEROS (Bloques de inicio impactantes)
    // ----------------------------------------------------------------------
    heros: {
        split_image: `
<section class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
            <div class="text-center lg:text-left">
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-6 border border-primary/20">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    {{HERO_BADGE}}
                </div>
                <h1 class="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                    {{HERO_TITLE}}
                </h1>
                <p class="text-lg md:text-xl opacity-80 mb-8 max-w-2xl mx-auto lg:mx-0">
                    {{HERO_SUBTITLE}}
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <button class="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-primary/30">
                        {{HERO_CTA1}}
                    </button>
                    <button class="glass-effect px-8 py-4 rounded-full font-bold text-lg hover:bg-primary/5 transition-colors border-2">
                        {{HERO_CTA2}}
                    </button>
                </div>
            </div>
            
            <div class="relative hidden lg:block">
                <div class="absolute inset-0 bg-gradient-to-tr from-primary to-secondary rounded-[3rem] blur-3xl opacity-30 animate-pulse"></div>
                <img src="https://loremflickr.com/800/1000/{{IMAGE_KEYWORD}}" alt="Hero Image" class="relative z-10 w-full h-[600px] object-cover rounded-[3rem] shadow-2xl border-4 border-white/10">
                
                <div class="absolute -bottom-10 -left-10 glass-effect p-6 rounded-2xl shadow-xl z-20 flex items-center gap-4 animate-bounce" style="animation-duration: 3s;">
                    <div class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white text-xl">
                        <i class="fas fa-check"></i>
                    </div>
                    <div>
                        <p class="font-bold">Calidad Premium</p>
                        <p class="text-sm opacity-80">Garantizada</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
        `,
        centered_gradient: `
<section class="relative pt-40 pb-32 overflow-hidden flex items-center justify-center min-h-[90vh] text-center">
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/30 rounded-full blur-[120px] -z-10"></div>
    
    <div class="max-w-4xl mx-auto px-4 relative z-10">
        <h1 class="text-6xl md:text-8xl font-extrabold mb-8 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary via-white to-secondary">
            {{HERO_TITLE}}
        </h1>
        <p class="text-xl md:text-2xl mb-10 opacity-80 max-w-2xl mx-auto font-light">
            {{HERO_SUBTITLE}}
        </p>
        <div class="flex flex-col sm:flex-row gap-6 justify-center">
            <a href="#catalogo" class="bg-primary text-white px-10 py-4 rounded-full font-bold text-lg hover:shadow-[0_0_40px_rgba(var(--primary),0.5)] transition-all">
                {{HERO_CTA1}} <i class="fas fa-arrow-right ml-2"></i>
            </a>
        </div>
    </div>
</section>
        `
    },

    // ----------------------------------------------------------------------
    // 4. PRODUCTOS / CATÁLOGO (Para E-commerce o Servicios)
    // ----------------------------------------------------------------------
    products: {
        modern_grid: `
<section id="catalogo" class="py-24 relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-bold mb-4">{{CATALOG_TITLE}}</h2>
            <p class="text-xl opacity-70">{{CATALOG_SUBTITLE}}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div class="group rounded-3xl overflow-hidden glass-effect border hover:-translate-y-2 transition-all duration-300">
                <div class="relative h-64 overflow-hidden">
                    <img src="https://loremflickr.com/600/400/{{IMAGE_KEYWORD}},1" alt="Product" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                    <div class="absolute top-4 right-4 bg-white/90 backdrop-blur text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        Destacado
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="text-2xl font-bold mb-2">{{PRODUCT_1_NAME}}</h3>
                    <p class="opacity-70 mb-4">{{PRODUCT_1_DESC}}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-2xl font-extrabold text-primary">{{PRODUCT_1_PRICE}}</span>
                        <button class="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="group rounded-3xl overflow-hidden glass-effect border hover:-translate-y-2 transition-all duration-300">
                <div class="relative h-64 overflow-hidden">
                    <img src="https://loremflickr.com/600/400/{{IMAGE_KEYWORD}},2" alt="Product" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                </div>
                <div class="p-6">
                    <h3 class="text-2xl font-bold mb-2">{{PRODUCT_2_NAME}}</h3>
                    <p class="opacity-70 mb-4">{{PRODUCT_2_DESC}}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-2xl font-extrabold text-primary">{{PRODUCT_2_PRICE}}</span>
                        <button class="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="group rounded-3xl overflow-hidden glass-effect border hover:-translate-y-2 transition-all duration-300">
                <div class="relative h-64 overflow-hidden">
                    <img src="https://loremflickr.com/600/400/{{IMAGE_KEYWORD}},3" alt="Product" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                    <div class="absolute top-4 right-4 bg-primary/90 backdrop-blur text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        Oferta
                    </div>
                </div>
                <div class="p-6">
                    <h3 class="text-2xl font-bold mb-2">{{PRODUCT_3_NAME}}</h3>
                    <p class="opacity-70 mb-4">{{PRODUCT_3_DESC}}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-2xl font-extrabold text-primary">{{PRODUCT_3_PRICE}}</span>
                        <button class="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-16 text-center">
            <button class="px-8 py-4 border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-full font-bold transition-colors">
                Ver todo el catálogo <i class="fas fa-arrow-right ml-2"></i>
            </button>
        </div>
    </div>
</section>
        `
    },

    // ----------------------------------------------------------------------
    // 5. SOBRE NOSOTROS (Para página nosotros.html)
    // ----------------------------------------------------------------------
    about: {
        story_split: `
<section class="py-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-16 items-center">
            <div class="relative">
                <div class="absolute -inset-4 bg-primary/20 rounded-[3rem] transform rotate-3 -z-10"></div>
                <img src="https://loremflickr.com/800/800/team,business" alt="Nuestro Equipo" class="rounded-[2rem] shadow-2xl w-full object-cover h-[500px]">
                <div class="absolute -bottom-8 -right-8 glass-effect p-8 rounded-2xl shadow-xl max-w-xs hidden md:block">
                    <p class="text-4xl font-extrabold text-primary mb-2">{{YEARS_EXPERIENCE}}+</p>
                    <p class="font-medium opacity-80">Años de experiencia transformando ideas en realidad.</p>
                </div>
            </div>
            
            <div>
                <h4 class="text-primary font-bold tracking-wider uppercase mb-2">Nuestra Historia</h4>
                <h2 class="text-4xl md:text-5xl font-bold mb-6 leading-tight">{{ABOUT_TITLE}}</h2>
                <div class="space-y-6 opacity-80 text-lg leading-relaxed">
                    <p>{{ABOUT_PARAGRAPH_1}}</p>
                    <p>{{ABOUT_PARAGRAPH_2}}</p>
                </div>
                
                <div class="mt-10 grid grid-cols-2 gap-6">
                    <div class="glass-effect p-6 rounded-xl border-t-4 border-primary">
                        <i class="fas fa-bullseye text-3xl text-primary mb-4"></i>
                        <h3 class="font-bold text-xl mb-2">Misión</h3>
                        <p class="opacity-70 text-sm">{{MISSION_TEXT}}</p>
                    </div>
                    <div class="glass-effect p-6 rounded-xl border-t-4 border-secondary">
                        <i class="fas fa-eye text-3xl text-secondary mb-4"></i>
                        <h3 class="font-bold text-xl mb-2">Visión</h3>
                        <p class="opacity-70 text-sm">{{VISION_TEXT}}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
        `
    },

    // ----------------------------------------------------------------------
    // 6. CARACTERÍSTICAS / VENTAJAS (Features)
    // ----------------------------------------------------------------------
    features: {
        bento_box: `
<section class="py-24 bg-black/5">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto mb-16">
            <h2 class="text-4xl font-bold mb-4">{{FEATURES_TITLE}}</h2>
            <p class="text-xl opacity-70">{{FEATURES_SUBTITLE}}</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 glass-effect p-10 rounded-3xl relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 group-hover:bg-primary/20 transition-all"></div>
                <i class="{{FEATURE_1_ICON}} text-5xl text-primary mb-6"></i>
                <h3 class="text-3xl font-bold mb-4">{{FEATURE_1_TITLE}}</h3>
                <p class="opacity-80 text-lg max-w-md">{{FEATURE_1_DESC}}</p>
            </div>
            
            <div class="glass-effect p-8 rounded-3xl group hover:bg-primary hover:text-white transition-colors duration-300">
                <i class="{{FEATURE_2_ICON}} text-4xl text-primary group-hover:text-white mb-6"></i>
                <h3 class="text-2xl font-bold mb-3">{{FEATURE_2_TITLE}}</h3>
                <p class="opacity-80">{{FEATURE_2_DESC}}</p>
            </div>

            <div class="glass-effect p-8 rounded-3xl group hover:bg-primary hover:text-white transition-colors duration-300">
                <i class="{{FEATURE_3_ICON}} text-4xl text-primary group-hover:text-white mb-6"></i>
                <h3 class="text-2xl font-bold mb-3">{{FEATURE_3_TITLE}}</h3>
                <p class="opacity-80">{{FEATURE_3_DESC}}</p>
            </div>

            <div class="md:col-span-2 glass-effect p-10 rounded-3xl flex flex-col justify-center items-center text-center bg-gradient-to-br from-primary/10 to-transparent">
                <h3 class="text-3xl font-bold mb-4">{{FEATURE_4_TITLE}}</h3>
                <p class="opacity-80 text-lg mb-6">{{FEATURE_4_DESC}}</p>
                <button class="bg-primary text-white px-6 py-2 rounded-full font-bold">Saber más</button>
            </div>
        </div>
    </div>
</section>
        `
    },

    // ----------------------------------------------------------------------
    // 7. PREGUNTAS FRECUENTES (Para faq.html)
    // ----------------------------------------------------------------------
    faq: {
        accordion: `
<section class="py-24">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <h2 class="text-4xl font-bold mb-4">{{FAQ_TITLE}}</h2>
            <p class="text-lg opacity-70">{{FAQ_SUBTITLE}}</p>
        </div>

        <div class="space-y-4">
            <div x-data="{ open: false }" class="glass-effect rounded-2xl overflow-hidden">
                <button @click="open = !open" class="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none">
                    <span class="font-bold text-lg">{{QUESTION_1}}</span>
                    <i class="fas" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
                <div x-show="open" x-collapse class="px-6 pb-5 opacity-80">
                    {{ANSWER_1}}
                </div>
            </div>

            <div x-data="{ open: false }" class="glass-effect rounded-2xl overflow-hidden">
                <button @click="open = !open" class="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none">
                    <span class="font-bold text-lg">{{QUESTION_2}}</span>
                    <i class="fas" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
                <div x-show="open" x-collapse class="px-6 pb-5 opacity-80">
                    {{ANSWER_2}}
                </div>
            </div>

            <div x-data="{ open: false }" class="glass-effect rounded-2xl overflow-hidden">
                <button @click="open = !open" class="w-full px-6 py-5 text-left flex justify-between items-center focus:outline-none">
                    <span class="font-bold text-lg">{{QUESTION_3}}</span>
                    <i class="fas" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
                <div x-show="open" x-collapse class="px-6 pb-5 opacity-80">
                    {{ANSWER_3}}
                </div>
            </div>
        </div>
    </div>
</section>
        `
    },

    // ----------------------------------------------------------------------
    // 8. TESTIMONIOS (Social Proof)
    // ----------------------------------------------------------------------
    testimonials: {
        cards_row: `
<section class="py-24 bg-black/5 overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
            <h2 class="text-4xl font-bold mb-4">{{TESTIMONIALS_TITLE}}</h2>
            <div class="flex justify-center gap-1 text-yellow-400 text-xl mb-4">
                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
            </div>
        </div>
        
        <div class="grid md:grid-cols-3 gap-8">
            <div class="glass-effect p-8 rounded-3xl relative">
                <i class="fas fa-quote-right absolute top-8 right-8 text-4xl opacity-10 text-primary"></i>
                <p class="italic opacity-80 mb-6 relative z-10">"{{TESTIMONIAL_1_TEXT}}"</p>
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">{{TESTIMONIAL_1_INITIAL}}</div>
                    <div>
                        <p class="font-bold">{{TESTIMONIAL_1_NAME}}</p>
                        <p class="text-sm opacity-60">{{TESTIMONIAL_1_ROLE}}</p>
                    </div>
                </div>
            </div>
            
            <div class="glass-effect p-8 rounded-3xl relative bg-primary text-white transform md:-translate-y-4 shadow-xl shadow-primary/30">
                <i class="fas fa-quote-right absolute top-8 right-8 text-4xl opacity-20"></i>
                <p class="italic mb-6 relative z-10">"{{TESTIMONIAL_2_TEXT}}"</p>
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold">{{TESTIMONIAL_2_INITIAL}}</div>
                    <div>
                        <p class="font-bold">{{TESTIMONIAL_2_NAME}}</p>
                        <p class="text-sm opacity-80">{{TESTIMONIAL_2_ROLE}}</p>
                    </div>
                </div>
            </div>

            <div class="glass-effect p-8 rounded-3xl relative">
                <i class="fas fa-quote-right absolute top-8 right-8 text-4xl opacity-10 text-primary"></i>
                <p class="italic opacity-80 mb-6 relative z-10">"{{TESTIMONIAL_3_TEXT}}"</p>
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">{{TESTIMONIAL_3_INITIAL}}</div>
                    <div>
                        <p class="font-bold">{{TESTIMONIAL_3_NAME}}</p>
                        <p class="text-sm opacity-60">{{TESTIMONIAL_3_ROLE}}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
        `
    },

    // ----------------------------------------------------------------------
    // 9. CALL TO ACTION (CTA)
    // ----------------------------------------------------------------------
    cta: {
        split_cta: `
<section class="py-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-gradient-to-r from-primary to-secondary rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
            <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
            <div class="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/3"></div>
            
            <div class="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                <div>
                    <h2 class="text-4xl md:text-5xl font-extrabold mb-4">{{CTA_TITLE}}</h2>
                    <p class="text-lg opacity-90">{{CTA_SUBTITLE}}</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-4 md:justify-end">
                    <button class="bg-white text-primary px-8 py-4 rounded-full font-bold text-lg hover:shadow-lg transition-all">
                        {{CTA_BUTTON_1}}
                    </button>
                    <button class="border-2 border-white/30 hover:bg-white/10 px-8 py-4 rounded-full font-bold text-lg transition-all">
                        {{CTA_BUTTON_2}}
                    </button>
                </div>
            </div>
        </div>
    </div>
</section>
        `
    },

    // ----------------------------------------------------------------------
    // 10. FOOTERS
    // ----------------------------------------------------------------------
    footers: {
        modern_dark: `
<footer class="bg-gray-900 text-white pt-20 pb-10 border-t border-white/10 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            
            <div class="col-span-1 md:col-span-2 lg:col-span-1">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center font-bold text-xl">
                        {{SITE_INITIAL}}
                    </div>
                    <span class="font-bold text-2xl tracking-tight">{{SITE_NAME}}</span>
                </div>
                <p class="opacity-70 mb-6 leading-relaxed">{{FOOTER_ABOUT}}</p>
                <div class="flex space-x-4">
                    <a href="#" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors"><i class="fab fa-twitter"></i></a>
                </div>
            </div>

            <div>
                <h4 class="font-bold text-lg mb-6">Enlaces Rápidos</h4>
                <ul class="space-y-3 opacity-70">
                    <li><a href="index.html" class="hover:text-primary transition-colors">Inicio</a></li>
                    <li><a href="nosotros.html" class="hover:text-primary transition-colors">Sobre Nosotros</a></li>
                    <li><a href="faq.html" class="hover:text-primary transition-colors">Preguntas Frecuentes</a></li>
                    <li><a href="contacto.html" class="hover:text-primary transition-colors">Contacto</a></li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-lg mb-6">Contacto</h4>
                <ul class="space-y-4 opacity-70">
                    <li class="flex items-start gap-3">
                        <i class="fas fa-map-marker-alt mt-1 text-primary"></i>
                        <span>{{FOOTER_ADDRESS}}</span>
                    </li>
                    <li class="flex items-center gap-3">
                        <i class="fas fa-clock text-primary"></i>
                        <span>{{FOOTER_HOURS}}</span>
                    </li>
                    <li class="flex items-center gap-3">
                        <i class="fas fa-envelope text-primary"></i>
                        <span>hola@{{SITE_NAME}}.com</span>
                    </li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-lg mb-6">Boletín</h4>
                <p class="opacity-70 mb-4">Suscríbete para recibir nuestras últimas ofertas y noticias.</p>
                <form class="flex">
                    <input type="email" placeholder="Tu email" class="w-full bg-white/10 px-4 py-3 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary text-white">
                    <button type="submit" class="bg-primary px-4 py-3 rounded-r-lg hover:opacity-90 transition-opacity">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>

        <div class="border-t border-white/10 pt-8 text-center opacity-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; 2026 {{SITE_NAME}}. Todos los derechos reservados.</p>
            <p class="text-sm">Creado con Wuepy IA 🧠</p>
        </div>
    </div>
</footer>
        `
    }
};