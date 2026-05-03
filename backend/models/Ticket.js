const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  changedAt: { type: String, required: true }, // IST datetime string
  changedBy: { type: String, required: true },
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  serialNumber: { type: Number, required: true },
  incidentStartTime: { type: String, required: true }, // IST datetime string YYYY-MM-DD HH:mm:ss
  incidentEndTime: { type: String, default: '' },
  issue: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
  systemsImpacted: { type: String, default: '' },
  businessCriticality: {
    type: String,
    required: true,
    enum: ['P1', 'P2', 'P3', 'P4'],
  },
  rca: { type: String, default: '' },
  interfaceName: { type: String, default: '' },
  executionId: { type: String, required: true, index: true },
  fixesDetails: { type: String, default: '' },
  status: {
    type: String,
    required: true,
    enum: ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'],
    default: 'Open',
    index: true,
  },
  statusHistory: [statusHistorySchema],
  lastUpdatedBy: { type: String, default: '' },
  lastUpdatedAt: { type: String, default: '' }, // IST datetime string
}, { timestamps: true });

// Compound unique index: executionId + projectId
ticketSchema.index({ executionId: 1, projectId: 1 }, { unique: true });

module.exports = mongoose.model('Ticket', ticketSchema);
