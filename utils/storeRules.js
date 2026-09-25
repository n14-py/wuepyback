const PLANS = {
    basico: { maxSites: 1, aiSites: 1, aiUpdatesPerMonth: 1, products: 80 },
    medio: { maxSites: 3, aiSites: 3, aiUpdatesPerMonth: 5, products: 500 },
    profesional: { maxSites: 25, aiSites: 25, aiUpdatesPerMonth: 999, products: 99999 }
};

const BLOCKED_SLUGS = new Set(['undefined', 'null', 'www', 'wuepy', 'api', 'admin', 'dashboard']);

function cleanSlug(subdomain, fallbackName) {
    const raw = (subdomain || fallbackName || '').toString();
    const slug = raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 32);
    if (!/^[a-z0-9]{3,32}$/.test(slug) || BLOCKED_SLUGS.has(slug)) return '';
    return slug;
}

function planOf(planId) {
    return PLANS[planId] || PLANS.basico;
}

function addMonths(date, months) {
    const base = new Date(date);
    const day = base.getDate();
    base.setMonth(base.getMonth() + months);
    if (base.getDate() < day) base.setDate(0);
    return base;
}

function subscriptionExpired(site, now = new Date()) {
    if (!site) return true;
    if (site.isActive === false || site.lockedByPlan) return true;
    if (['suspended', 'pending_payment', 'expired'].includes(site.subscriptionStatus)) return true;
    if (site.subscriptionStatus === 'trial' && site.trialEndsAt && now > new Date(site.trialEndsAt)) return true;
    if (site.subscriptionStatus === 'active' && site.nextBillingDate && now > new Date(site.nextBillingDate)) return true;
    return false;
}

module.exports = { PLANS, cleanSlug, planOf, addMonths, subscriptionExpired };
