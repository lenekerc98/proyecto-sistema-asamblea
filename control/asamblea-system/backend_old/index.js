const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const attendeesRouter = require('./routes/attendees');
const votingRouter = require('./routes/voting');

app.use(cors());
app.use(express.json());

app.use('/api/attendees', attendeesRouter);
app.use('/api/voting', votingRouter);

// Test Route
app.get('/', (req, res) => {
    res.send('Assembly Voting System API');
});

// Database Connection Test
app.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ message: 'Database Connected', time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Connection Failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
