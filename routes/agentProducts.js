// routes/agentProducts.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { ensureAuthenticated } = require('../middleware/auth');
const Agent = require('../models/Agent');
const AgentProduct = require('../models/AgentProduct');
const { subirImagenBuffer } = require('../utils/bunnyStorage'); // Usamos tu utilidad de LFAF

// Configuración de Multer para recibir imágenes en memoria antes de subirlas a la nube
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB por imagen
});

/**
 * --- GESTIÓN DE PRODUCTOS POR AGENTE ---
 * Permite listar, crear, editar y eliminar productos del catálogo de la IA.
 */

// 1. LISTAR TODOS LOS PRODUCTOS DEL USUARIO
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        if (!agent) return res.status(404).json({ msg: 'Primero debes configurar tu Agente.' });

        const productos = await AgentProduct.find({ agent: agent._id }).sort({ createdAt: -1 });
        res.json({ ok: true, productos });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al obtener catálogo.' });
    }
});

// 2. CREAR NUEVO PRODUCTO (Con Carga de Imagen)
router.post('/', ensureAuthenticated, upload.single('imagen'), async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        if (!agent) return res.status(404).json({ msg: 'Agente no encontrado.' });

        const { name, price, description, aiDescription, category, stock } = req.body;
        
        let imageUrl = '';
        if (req.file) {
            // Subimos el buffer directamente a tu almacenamiento (BunnyCDN/Cloudinary)
            imageUrl = await subirImagenBuffer(req.file.buffer);
        }

        const nuevoProducto = new AgentProduct({
            agent: agent._id,
            name,
            price: parseInt(price),
            description,
            aiDescription: aiDescription || `Excelente ${name} de alta calidad.`,
            category: category || 'General',
            stock: parseInt(stock) || 100,
            imageUrl
        });

        await nuevoProducto.save();
        res.json({ ok: true, producto: nuevoProducto });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al crear producto.' });
    }
});

// 3. EDITAR PRODUCTO EXISTENTE
router.put('/:id', ensureAuthenticated, upload.single('imagen'), async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        const producto = await AgentProduct.findOne({ _id: req.params.id, agent: agent._id });

        if (!producto) return res.status(404).json({ msg: 'Producto no encontrado o no te pertenece.' });

        const { name, price, description, aiDescription, category, stock, isActive } = req.body;

        // Actualizamos campos básicos
        producto.name = name || producto.name;
        producto.price = price ? parseInt(price) : producto.price;
        producto.description = description || producto.description;
        producto.aiDescription = aiDescription || producto.aiDescription;
        producto.category = category || producto.category;
        producto.stock = stock ? parseInt(stock) : producto.stock;
        producto.isActive = isActive !== undefined ? isActive : producto.isActive;

        // Si subió una imagen nueva, la reemplazamos
        if (req.file) {
            producto.imageUrl = await subirImagenBuffer(req.file.buffer);
        }

        await producto.save();
        res.json({ ok: true, producto });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error al actualizar.' });
    }
});

// 4. ELIMINAR PRODUCTO (Baja lógica o física)
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        const resultado = await AgentProduct.deleteOne({ _id: req.params.id, agent: agent._id });

        if (resultado.deletedCount === 0) {
            return res.status(404).json({ msg: 'No se pudo eliminar el producto.' });
        }

        res.json({ ok: true, msg: 'Producto eliminado del catálogo.' });
    } catch (error) {
        res.status(500).json({ ok: false });
    }
});

// 5. OBTENER UN PRODUCTO ESPECÍFICO (Para el modal de edición)
router.get('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const agent = await Agent.findOne({ user: req.user._id });
        const producto = await AgentProduct.findOne({ _id: req.params.id, agent: agent._id });
        
        if (!producto) return res.status(404).json({ msg: 'No encontrado.' });
        res.json({ ok: true, producto });
    } catch (error) {
        res.status(500).json({ ok: false });
    }
});

module.exports = router;