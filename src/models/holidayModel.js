const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    isPublicHoliday: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Holiday', holidaySchema);