// ==========================================================================
// EL CEREBRO MAESTRO DE WUEPY - RUTAS DEL SÚPER ADMINISTRADOR (API REST)
// ==========================================================================

const express = require('express');
const router = express.Router();
const Site = require('../models/Site');
const User = require('../models/User');

const { ensureAuthenticated, ensureSuperAdmin } = require('../middleware/auth');

// ==========================================================================
// 1. PANEL PRINCIPAL (DASHBOARD MAESTRO)
// ==========================================================================
router.get('/', ensureSuperAdmin, async (req, res) => {
    try {
        const sites = await Site.find().populate('owner', 'email name').lean();

        let mrr = 0;
        let activeSites = 0;
        let trialSites = 0;
        let suspendedSites = 0;
        let pendingReceipts = [];
        let pendingApoya = []; 

        const allSitesFormatted = [];

        sites.forEach(site => {
            if (site.subscriptionStatus === 'active') {
                activeSites++;
                if (site.plan === 'basico') mrr += 30000;
                if (site.plan === 'medio') mrr += 100000;
                if (site.plan === 'profesional') mrr += 200000;
            } else if (site.subscriptionStatus === 'trial') {
                trialSites++;
            } else {
                suspendedSites++;
            }

            if (site.paymentReceipts && site.paymentReceipts.length > 0) {
                const pending = site.paymentReceipts.filter(r => r.status === 'pending');
                pending.forEach(receipt => {
                    pendingReceipts.push({
                        ...receipt,
                        siteId: site._id,
                        siteName: site.name,
                        ownerEmail: site.owner ? site.owner.email : 'Sin dueño'
                    });
                });
            }

            if (site.wuepyApoya && site.wuepyApoya.status === 'pending') {
                pendingApoya.push({
                    siteId: site._id,
                    siteName: site.name,
                    ownerEmail: site.owner ? site.owner.email : 'Sin dueño',
                    story: site.wuepyApoya.startupStory,
                    videoUrl: site.wuepyApoya.videoEvidenceUrl
                });
            }

            allSitesFormatted.push({
                _id: site._id,
                name: site.name,
                subdomain: site.subdomain,
                plan: site.plan,
                subscriptionStatus: site.subscriptionStatus || 'trial',
                trialEndsAt: site.trialEndsAt,
                nextBillingDate: site.nextBillingDate,
                ownerEmail: site.owner ? site.owner.email : 'No registrado'
            });
        });

        pendingReceipts.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));

        const metrics = { mrr, activeSites, trialSites, suspendedSites };

        return res.status(200).json({ 
            success: true,
            user: req.user, 
            metrics, 
            pendingReceipts, 
            pendingApoya, 
            allSites: allSitesFormatted 
        });

    } catch (error) {
        console.error('❌ Error Crítico en SuperAdmin API Dashboard:', error);
        return res.status(500).json({ success: false, message: 'Fallo al cargar el panel maestro. Revisa los logs.' });
    }
});

// ==========================================================================
// 2. SISTEMA DE FACTURACIÓN (APROBAR PAGOS MANUALES)
// ==========================================================================
router.post('/billing/approve', ensureSuperAdmin, async (req, res) => {
    try {
        const { receiptId, siteId } = req.body;

        const site = await Site.findById(siteId);
        if (!site) return res.status(404).json({ success: false, message: 'La tienda asociada al pago no existe.' });

        const receipt = site.paymentReceipts.id(receiptId);
        if (!receipt) return res.status(404).json({ success: false, message: 'El comprobante no fue encontrado.' });

        if (receipt.status === 'approved') return res.status(400).json({ success: false, message: 'Este pago ya había sido aprobado.' });

        receipt.status = 'approved';
        receipt.adminNotes = 'Aprobado por Administración';

        const monthsToAdd = parseInt(receipt.monthsPaid) || 1;
        const now = new Date();
        
        let currentBillingDate = site.nextBillingDate ? new Date(site.nextBillingDate) : now;
        
        if (currentBillingDate < now || site.subscriptionStatus !== 'active') {
            currentBillingDate = now;
        }

        currentBillingDate.setMonth(currentBillingDate.getMonth() + monthsToAdd);

        site.subscriptionStatus = 'active';
        site.nextBillingDate = currentBillingDate;
        
        if (receipt.planRequested && receipt.planRequested !== site.plan) {
            site.plan = receipt.planRequested;
        }

        await site.save();

        return res.status(200).json({ success: true, message: `¡Pago aprobado! La tienda ${site.name} ahora está activa hasta el ${currentBillingDate.toLocaleDateString('es-PY')}.` });

    } catch (error) {
        console.error('❌ Error aprobando pago:', error);
        return res.status(500).json({ success: false, message: 'Ocurrió un error al intentar aprobar la transferencia.' });
    }
});

// ==========================================================================
// 3. SISTEMA DE FACTURACIÓN (RECHAZAR PAGOS)
// ==========================================================================
router.post('/billing/reject', ensureSuperAdmin, async (req, res) => {
    try {
        const { receiptId, siteId, reason } = req.body;

        const site = await Site.findById(siteId);
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        const receipt = site.paymentReceipts.id(receiptId);
        if (receipt) {
            receipt.status = 'rejected';
            receipt.adminNotes = reason || 'El comprobante no es válido o el monto es incorrecto.';
            await site.save();
            return res.status(200).json({ success: true, message: `El pago de la tienda ${site.name} fue rechazado.` });
        }

        return res.status(404).json({ success: false, message: 'Comprobante no encontrado.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al rechazar el comprobante.' });
    }
});

// ==========================================================================
// 4. SUSPENSIÓN Y REACTIVACIÓN RÁPIDA DE TIENDAS
// ==========================================================================
router.post('/sites/toggle-suspend', ensureSuperAdmin, async (req, res) => {
    try {
        const { siteId, action } = req.body;
        
        const site = await Site.findById(siteId);
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        let msg = '';
        if (action === 'suspend') {
            site.subscriptionStatus = 'suspended';
            msg = `La tienda ${site.name} ha sido bloqueada. El dueño ya no puede vender.`;
        } else if (action === 'activate') {
            site.subscriptionStatus = 'active';
            if (!site.nextBillingDate || new Date(site.nextBillingDate) < new Date()) {
                let graceDate = new Date();
                graceDate.setMonth(graceDate.getMonth() + 1);
                site.nextBillingDate = graceDate;
            }
            msg = `La tienda ${site.name} ha sido reactivada manualmente.`;
        }

        await site.save();
        return res.status(200).json({ success: true, message: msg });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error al procesar el cambio de estado de la tienda.' });
    }
});

// ==========================================================================
// 5. EDICIÓN MANUAL DEL PLAN Y VENCIMIENTOS
// ==========================================================================
router.post('/sites/update-subscription', ensureSuperAdmin, async (req, res) => {
    try {
        const { siteId, status, plan, trialEndsAt, nextBillingDate } = req.body;

        const site = await Site.findById(siteId);
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        site.subscriptionStatus = status;
        site.plan = plan;

        if (trialEndsAt) site.trialEndsAt = new Date(trialEndsAt);
        if (nextBillingDate) site.nextBillingDate = new Date(nextBillingDate);

        await site.save();
        return res.status(200).json({ success: true, message: `Se forzaron los cambios de suscripción para ${site.name}.` });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error crítico al modificar la base de datos de la tienda.' });
    }
});

// ==========================================================================
// 6. GESTIÓN DEL PROGRAMA: WUEPY APOYA (VIDEOS UGC)
// ==========================================================================
router.post('/programs/apoya/approve', ensureSuperAdmin, async (req, res) => {
    try {
        const { siteId } = req.body;
        const site = await Site.findById(siteId);
        if (!site) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });

        site.wuepyApoya.status = 'approved';
        site.wuepyApoya.freeMonthsGranted = 6;
        
        const now = new Date();
        let baseDate = site.subscriptionStatus === 'active' && site.nextBillingDate && site.nextBillingDate > now 
                        ? new Date(site.nextBillingDate) 
                        : now;
        
        baseDate.setMonth(baseDate.getMonth() + 6);
        site.nextBillingDate = baseDate;
        site.subscriptionStatus = 'active'; 
        
        await site.save();
        return res.status(200).json({ success: true, message: `¡Éxito! 6 Meses Gratis otorgados a la tienda ${site.name}.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Ocurrió un error al otorgar los meses gratis.' });
    }
});

router.post('/programs/apoya/reject', ensureSuperAdmin, async (req, res) => {
    try {
        const { siteId } = req.body;
        const site = await Site.findById(siteId);
        if (site) {
            site.wuepyApoya.status = 'rejected';
            await site.save();
            return res.status(200).json({ success: true, message: `El enlace de video de la tienda ${site.name} ha sido rechazado.` });
        }
        return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Ocurrió un error al rechazar la postulación.' });
    }
});

module.exports = router;