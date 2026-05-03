const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { requireAuth } = require('../middleware/auth');

// GET all projects
router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create project
router.post('/', requireAuth, async (req, res) => {
  try {
    const { projectName } = req.body;
    if (!projectName || !projectName.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const existing = await Project.findOne({ projectName: projectName.trim() });
    if (existing) {
      return res.status(409).json({ error: 'Project name already exists' });
    }

    const project = new Project({ projectName: projectName.trim() });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Project name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE project
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
