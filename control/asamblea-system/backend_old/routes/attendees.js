const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all attendees
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM attendees ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register/Import attendee
router.post('/', async (req, res) => {
    const { name, identification, shares, percentage, observations } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO attendees (name, identification, shares, percentage, observations) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, identification, shares, percentage, observations]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update check-in status
router.put('/:id/checkin', async (req, res) => {
    const { id } = req.params;
    const { attended } = req.body; // true or false
    try {
        const result = await pool.query(
            'UPDATE attendees SET attended = $1 WHERE id = $2 RETURNING *',
            [attended, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Quorum (Total shares checked in)
router.get('/quorum', async (req, res) => {
    try {
        const result = await pool.query('SELECT SUM(shares) as total_shares, SUM(percentage) as total_percentage FROM attendees WHERE attended = true');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
