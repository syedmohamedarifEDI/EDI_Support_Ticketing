const express = require('express');
const router = express.Router();
const Technician = require('../models/Technician');
const { requireAuth } = require('../middleware/auth');

// GET all technicians
router.get('/', requireAuth, async (req, res) => {
  try {
    const technicians = await Technician.find().sort({ name: 1 });
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create technician
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Technician name is required' });
    }

    const technician = new Technician({ name: name.trim(), email: email || '' });
    await technician.save();
    res.status(201).json(technician);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update technician
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Technician name is required' });
    }

    const technician = await Technician.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), email: email || '' },
      { new: true, runValidators: true }
    );
    if (!technician) return res.status(404).json({ error: 'Technician not found' });
    res.json(technician);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE technician
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const technician = await Technician.findByIdAndDelete(req.params.id);
    if (!technician) return res.status(404).json({ error: 'Technician not found' });
    res.json({ message: 'Technician deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
