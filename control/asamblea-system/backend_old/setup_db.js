const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    try {
        const schemaPath = path.join(__dirname, '../database.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running database setup...');
        await pool.query(schemaSql);
        console.log('Database setup completed successfully.');
    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        await pool.end();
    }
}

setupDatabase();
