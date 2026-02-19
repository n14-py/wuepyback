// UBICACIÓN: lfaftech.com/controllers/posController.js

const PosProduct = require('../models/PosProduct');
const PosSale = require('../models/PosSale');

module.exports = {

    // --- GESTIÓN DE INVENTARIO ---

    // 1. Obtener todos los productos del usuario (Para la lista de administración)
    getInventory: async (req, res) => {
        try {
            const products = await PosProduct.find({ user: req.user._id })
                                           .sort({ name: 1 });
            // Si es una petición API (JSON), devolvemos datos, si no, renderizamos vista
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ success: true, products });
            }
            res.render('dashboard/pos/inventory', { products });
        } catch (err) {
            console.error(err);
            if (req.xhr) return res.status(500).json({ error: 'Error al cargar inventario' });
            req.flash('error_msg', 'Error al cargar inventario');
            res.redirect('/dashboard');
        }
    },

    // 2. Guardar nuevo producto (Manual o con Escáner)
    saveProduct: async (req, res) => {
        const { 
            name, barcode, salePrice, costPrice, 
            stock, minStock, unitType, isWeighted 
        } = req.body;

        try {
            // Verificar si el código de barras ya existe para este usuario
            if (barcode) {
                const existing = await PosProduct.findOne({ user: req.user._id, barcode });
                if (existing) {
                    return res.status(400).json({ 
                        success: false, 
                        msg: '¡Este código de barras ya está registrado en tu inventario!' 
                    });
                }
            }

            const newProduct = new PosProduct({
                user: req.user._id,
                name,
                barcode,
                salePrice: parseFloat(salePrice),
                costPrice: parseFloat(costPrice) || 0,
                stock: parseFloat(stock) || 0,
                minStock: parseInt(minStock) || 5,
                unitType: unitType || 'UNIDAD',
                isWeighted: isWeighted === 'on' || isWeighted === true // Checkbox HTML
            });

            await newProduct.save();

            if (req.xhr) {
                return res.json({ success: true, msg: 'Producto guardado correctamente' });
            }
            req.flash('success_msg', 'Producto agregado');
            res.redirect('/dashboard/pos/inventory');

        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, msg: 'Error al guardar producto' });
        }
    },

    // --- PUNTO DE VENTA (POS) ---

    // 3. Renderizar la pantalla de Ventas (La interfaz principal)
    renderPosScreen: async (req, res) => {
        try {
            // Enviamos solo productos activos para el buscador rápido
            const products = await PosProduct.find({ user: req.user._id, isActive: true })
                                           .select('name barcode salePrice image isWeighted stock');
            res.render('dashboard/pos/terminal', { products });
        } catch (err) {
            console.error(err);
            res.redirect('/dashboard');
        }
    },

    // 4. API: Buscar producto por Código de Barras (Para el escáner del celular)
    scanBarcode: async (req, res) => {
        const { code } = req.query;
        try {
            const product = await PosProduct.findOne({ 
                user: req.user._id, 
                barcode: code 
            });

            if (!product) {
                return res.json({ success: false, msg: 'Producto no encontrado' });
            }
            res.json({ success: true, product });
        } catch (err) {
            res.status(500).json({ success: false, msg: 'Error de servidor' });
        }
    },

    // 5. PROCESAR VENTA (El núcleo transaccional)
    processSale: async (req, res) => {
        const { cart, paymentMethod, clientName, discount, total } = req.body;
        // 'cart' es un array que viene del frontend: [{ productId, quantity, price... }]

        if (!cart || cart.length === 0) {
            return res.status(400).json({ success: false, msg: 'El carrito está vacío' });
        }

        try {
            const saleItems = [];
            
            // Iterar sobre el carrito para verificar stock y preparar datos
            for (let item of cart) {
                const product = await PosProduct.findById(item.productId);
                
                if (!product) continue; // Si se borró mientras vendían, lo saltamos
                
                // Verificar Stock (si el producto requiere control)
                if (product.trackStock) {
                    if (product.stock < item.quantity) {
                        return res.status(400).json({ 
                            success: false, 
                            msg: `Stock insuficiente para: ${product.name}. Disponible: ${product.stock}` 
                        });
                    }
                    // Descontar Stock
                    product.stock -= item.quantity;
                    await product.save();
                }

                saleItems.push({
                    product: product._id,
                    productName: product.name,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    subtotal: item.quantity * item.price
                });
            }

            // Crear el registro de venta
            const newSale = new PosSale({
                user: req.user._id,
                clientName: clientName || 'Cliente General',
                items: saleItems,
                totalAmount: total,
                discount: discount || 0,
                paymentMethod: paymentMethod || 'EFECTIVO'
            });

            await newSale.save();

            res.json({ 
                success: true, 
                saleId: newSale._id, 
                receiptNumber: newSale.receiptNumber,
                msg: '¡Venta registrada con éxito!' 
            });

        } catch (err) {
            console.error('Error en venta:', err);
            res.status(500).json({ success: false, msg: 'Error al procesar la venta' });
        }
    },

    // 6. Historial de Ventas (Reporte rápido)
    getSalesHistory: async (req, res) => {
        try {
            const sales = await PosSale.find({ user: req.user._id })
                                     .sort({ date: -1 })
                                     .limit(50); // Últimas 50 ventas
            res.render('dashboard/pos/history', { sales });
        } catch (err) {
            console.error(err);
            res.redirect('/dashboard/pos/terminal');
        }
    }
};