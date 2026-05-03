const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  currentValue: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
