const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Counter = require('../models/Counter');
const { requireAuth } = require('../middleware/auth');
const { isValidDateTimeFormat, nowIST } = require('../utils/datetime');

const VALID_STATUSES = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];
const VALID_PRIORITIES = ['P1', 'P2', 'P3', 'P4'];

const validateTicketBody = (body, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || body.issue !== undefined) {
    if (!body.issue || !body.issue.trim()) errors.push('Issue is required');
  }
  if (!isUpdate || body.assignedTo !== undefined) {
    if (!body.assignedTo) errors.push('Assigned To is required');
  }
  if (!isUpdate || body.businessCriticality !== undefined) {
    if (!body.businessCriticality || !VALID_PRIORITIES.includes(body.businessCriticality)) {
      errors.push('Business Criticality must be P1, P2, P3, or P4');
    }
  }
  if (!isUpdate || body.status !== undefined) {
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
  }
  if (!isUpdate || body.executionId !== undefined) {
    if (!body.executionId || !body.executionId.trim()) errors.push('Execution ID is required');
  }
  if (body.incidentStartTime && !isValidDateTimeFormat(body.incidentStartTime)) {
    errors.push('Incident Start Time must be in format YYYY-MM-DD HH:mm:ss');
  }
  if (body.incidentEndTime && !isValidDateTimeFormat(body.incidentEndTime)) {
    errors.push('Incident End Time must be in format YYYY-MM-DD HH:mm:ss');
  }

  return errors;
};

// GET all tickets with filters and pagination
router.get('/', requireAuth, async (req, res) => {
  try {
    const { projectId, status, assignedTo, page = 1, limit = 20, sortBy = 'serialNumber', sortOrder = 'desc' } = req.query;

    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('projectId', 'projectName')
        .populate('assignedTo', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(filter),
    ]);

    res.json({ tickets, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single ticket
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('projectId', 'projectName')
      .populate('assignedTo', 'name email');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create ticket
router.post('/', requireAuth, async (req, res) => {
  try {
    const errors = validateTicketBody(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const { projectId, incidentStartTime, incidentEndTime, issue, assignedTo, systemsImpacted,
      businessCriticality, rca, interfaceName, executionId, fixesDetails, status } = req.body;

    if (!projectId) return res.status(400).json({ errors: ['Project ID is required'] });
    if (!incidentStartTime || !isValidDateTimeFormat(incidentStartTime)) {
      return res.status(400).json({ errors: ['Incident Start Time is required and must be in format YYYY-MM-DD HH:mm:ss'] });
    }

    // Atomic increment serial number
    const counter = await Counter.findOneAndUpdate(
      { projectId },
      { $inc: { currentValue: 1 } },
      { new: true, upsert: true }
    );

    const nowStr = nowIST();
    const username = req.session.username;

    const ticket = new Ticket({
      projectId,
      serialNumber: counter.currentValue,
      incidentStartTime,
      incidentEndTime: incidentEndTime || '',
      issue: issue.trim(),
      assignedTo,
      systemsImpacted: systemsImpacted || '',
      businessCriticality,
      rca: rca || '',
      interfaceName: interfaceName || '',
      executionId: executionId.trim(),
      fixesDetails: fixesDetails || '',
      status: status || 'Open',
      statusHistory: [{ status: status || 'Open', changedAt: nowStr, changedBy: username }],
      lastUpdatedBy: username,
      lastUpdatedAt: nowStr,
    });

    await ticket.save();
    await ticket.populate(['projectId', 'assignedTo']);
    res.status(201).json(ticket);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ errors: ['Execution ID already exists for this project'] });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT update ticket
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const errors = validateTicketBody(req.body, true);
    if (errors.length > 0) return res.status(400).json({ errors });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const nowStr = nowIST();
    const username = req.session.username;

    const allowedFields = ['incidentStartTime', 'incidentEndTime', 'issue', 'assignedTo',
      'systemsImpacted', 'businessCriticality', 'rca', 'interfaceName', 'executionId',
      'fixesDetails', 'status'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        ticket[field] = req.body[field];
      }
    });

    // Append to status history if status changed
    if (req.body.status && req.body.status !== ticket.status) {
      ticket.statusHistory.push({ status: req.body.status, changedAt: nowStr, changedBy: username });
    }

    ticket.lastUpdatedBy = username;
    ticket.lastUpdatedAt = nowStr;

    await ticket.save();
    await ticket.populate(['projectId', 'assignedTo']);
    res.json(ticket);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ errors: ['Execution ID already exists for this project'] });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE ticket
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
