const mongoose = require('mongoose');

const AgentDeliverySchema = new mongoose.Schema({
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    currentOrders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AgentOrder'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AgentDelivery', AgentDeliverySchema);