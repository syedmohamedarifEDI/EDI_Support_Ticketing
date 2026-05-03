const express = require('express');
const router = express.Router();
const User = require('../models/User');

const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME;
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;

// Seed the default admin user if env vars are set
const seedUser = async () => {
  if (!DEFAULT_ADMIN_USERNAME || !DEFAULT_ADMIN_PASSWORD) {
    return;
  }

  try {
    const exists = await User.findOne({ username: DEFAULT_ADMIN_USERNAME });
    if (!exists) {
      const user = new User({
        username: DEFAULT_ADMIN_USERNAME,
        password: DEFAULT_ADMIN_PASSWORD,
      });
      await user.save();
      console.log('✅ Default admin user seeded');
    }
  } catch (err) {
    console.error('Error seeding user:', err);
  }
};
seedUser();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user._id.toString();
    req.session.username = user.username;

    return res.json({ message: 'Login successful', username: user.username });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ username: req.session.username, loggedIn: true });
  }
  return res.status(401).json({ loggedIn: false });
});

module.exports = router;
