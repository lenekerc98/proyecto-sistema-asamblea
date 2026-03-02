-- Database Schema for Assembly Voting System (PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL -- 'admin', 'shareholder', 'user'
);

-- Table: attendees (Shareholders)
CREATE TABLE attendees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    identification TEXT UNIQUE NOT NULL, -- Cedula/RUC
    shares INTEGER NOT NULL DEFAULT 0, -- Number of shares (voting power)
    percentage NUMERIC(5, 3) NOT NULL DEFAULT 0, -- Share percentage
    attended BOOLEAN DEFAULT FALSE,
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    attendee_id INTEGER REFERENCES attendees(id) ON DELETE SET NULL, -- Link to shareholder if applicable
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: questions
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OPEN', 'CLOSED')),
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: votes
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    attendee_id INTEGER REFERENCES attendees(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id), -- User who cast the vote (audit)
    vote_option VARCHAR(20) NOT NULL CHECK (vote_option IN ('YES', 'NO', 'BLANK', 'ABSTAIN')),
    recorded_shares INTEGER NOT NULL, -- Snapshot of shares at time of vote
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, attendee_id)
);

-- Initial Roles
INSERT INTO roles (name) VALUES ('admin'), ('shareholder') ON CONFLICT DO NOTHING;
