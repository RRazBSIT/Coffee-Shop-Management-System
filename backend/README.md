# MR Café Backend

Node.js + Express + TypeScript API for the MR Café React application. The database server is XAMPP MySQL/MariaDB.

## Requirements
- Node.js 20 or newer
- XAMPP with MySQL/MariaDB running
- phpMyAdmin (included with XAMPP)

## Setup
1. Copy `.env.example` to `.env` and configure your local database credentials.
2. In phpMyAdmin, import `database/schema.sql`.
3. Import `database/seed.sql`.
4. Install dependencies: `npm install`.
5. Start the API: `npm run dev`.
6. Check `http://localhost:5000/api/health`.

The health endpoint checks both the API and database connection.

## Important security notes
- `.env` must never be committed to Git.
- The public customer registration flow must only create customer accounts.
- Staff accounts are separate and must be created by an authorized admin or a secure one-time setup script.
- Do not expose MySQL directly to the React browser application. React must call this API.
- GCash is recorded as a payment method; this starter does not verify GCash payments with a payment gateway.

## Current scope
This is the backend foundation and initial database schema. Feature APIs (authentication, menu administration, order processing, kitchen updates, inventory deduction, loyalty and reports) will be implemented and tested in subsequent steps.
