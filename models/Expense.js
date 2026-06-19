const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    site: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Site', 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true 
    },
    category: { 
        type: String, 
        default: 'general' 
    },
    date: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Expense', ExpenseSchema);