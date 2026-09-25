const User = require('../models/User');
const Site = require('../models/Site');
const { planOf } = require('./storeRules');

async function applyAccountPlan(userId, nextPlan) {
    const planId = ['basico', 'medio', 'profesional'].includes(nextPlan) ? nextPlan : 'basico';
    const limits = planOf(planId);
    const user = await User.findById(userId);
    if (!user) return null;
    user.plan = planId;
    if (!user.planChosenAt) user.planChosenAt = new Date();
    await user.save();

    const sites = await Site.find({ owner: userId }).sort({ createdAt: 1 });
    for (let i = 0; i < sites.length; i++) {
        sites[i].plan = planId;
        sites[i].lockedByPlan = i >= limits.maxSites;
        await sites[i].save();
    }
    return { plan: planId, limits, locked: sites.filter(s => s.lockedByPlan).map(s => s._id) };
}

module.exports = { applyAccountPlan };
