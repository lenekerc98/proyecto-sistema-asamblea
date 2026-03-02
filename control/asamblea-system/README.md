# Assembly Voting System

A full-stack application for managing shareholder assemblies and voting.

## Project Structure

-   `backend/`: Node.js + Express API server.
-   `frontend/`: React + Vite client application.
-   `database.sql`: PostgreSQL schema definitions.

## Getting Started

### Prerequisites

-   Node.js (v18+)
-   PostgreSQL

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables in `.env`:
    ```env
    PORT=3000
    DB_USER=postgres
    DB_PASSWORD=your_password
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=asamblea_system
    ```
4.  Initialize the database:
    ```bash
    node setup_db.js
    ```
5.  Start the server:
    ```bash
    npm run dev
    ```

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## Usage

1.  Open the frontend application (typically `http://localhost:5173`).
2.  Start with the "Attendees & Quorum" tab to verify the quorum.
3.  Switch to "Topics & Voting" to manage questions and visualize results.
