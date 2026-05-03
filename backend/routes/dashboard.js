const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { requireAuth } = require('../middleware/auth');

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const [total, open, inProgress, onHold, resolved, closed, recent] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'Open' }),
      Ticket.countDocuments({ status: 'In Progress' }),
      Ticket.countDocuments({ status: 'On Hold' }),
      Ticket.countDocuments({ status: 'Resolved' }),
      Ticket.countDocuments({ status: 'Closed' }),
      Ticket.find()
        .populate('projectId', 'projectName')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    res.json({ total, open, inProgress, onHold, resolved, closed, recentTickets: recent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
