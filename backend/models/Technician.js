const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Technician', technicianSchema);
