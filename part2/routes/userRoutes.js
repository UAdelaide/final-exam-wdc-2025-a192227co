const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all users (for admin/testing)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, username, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST a new user (simple signup)
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const [result] = await db.query(`
      INSERT INTO Users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `, [username, email, password, role]);

    res.status(201).json({ message: 'User registered', user_id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json(req.session.user);
});

// POST login (dummy version)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(`
      SELECT user_id, username, role FROM Users
      WHERE email = ? AND password_hash = ?
    `, [email, password]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    req.session.user = user;
    res.json({ message: 'Login successful', user: rows[0] }); // store the user's logged in session, allowing them to use it when revisitng
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;

router.post('/logout', async (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: "Log out failed" });
    }

    res.clearCookie('connect.sid');
    res.json({ message: 'Successful log out' });
  });
});

router.get('/dogs', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'owner') {
    return res.status(403).json({ error: 'Cant access this' });
  }

  const ownerID = req.session.user.id;

  try {
    const [rows] = await db.query(`
      SELECT dog_id, name FROM Dogs
      WHERE owner_id = ?
    `, [ownerId]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load" });
  }
});

