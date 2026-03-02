const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all questions
router.get('/questions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM questions ORDER BY "order" ASC, created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new question
router.post('/questions', async (req, res) => {
    const { text, order } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO questions (text, "order") VALUES ($1, $2) RETURNING *',
            [text, order]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update question status (OPEN, CLOSED, PENDING)
router.put('/questions/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE questions SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cast a vote
router.post('/vote', async (req, res) => {
    const { question_id, attendee_id, vote_option } = req.body;

    // Start a transaction to ensure integrity
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if question is OPEN
        const questionRes = await client.query('SELECT status FROM questions WHERE id = $1', [question_id]);
        if (questionRes.rows.length === 0 || questionRes.rows[0].status !== 'OPEN') {
            throw new Error('Question is not open for voting.');
        }

        // Get attendee shares
        const attendeeRes = await client.query('SELECT shares, attended FROM attendees WHERE id = $1', [attendee_id]);
        if (attendeeRes.rows.length === 0) {
            throw new Error('Attendee not found.');
        }
        const { shares, attended } = attendeeRes.rows[0];

        if (!attended) {
            throw new Error('Attendee has not checked in.');
        }

        // Insert vote
        const result = await client.query(
            'INSERT INTO votes (question_id, attendee_id, vote_option, recorded_shares) VALUES ($1, $2, $3, $4) RETURNING *',
            [question_id, attendee_id, vote_option, shares]
        );

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Get results for a question
router.get('/questions/:id/results', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT vote_option, SUM(recorded_shares) as total_shares, COUNT(*) as vote_count 
       FROM votes WHERE question_id = $1 GROUP BY vote_option`,
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
