# Inventory Management System

A full-stack inventory management application for managing products, suppliers, customers, orders, stock, sales, and profit reporting.

## Architecture

![Inventory Management System architecture](docs/architecture.png)

The React frontend communicates with a Flask REST API. The backend organizes API routes, business services, data validation, and SQLAlchemy models; SQLite is used by default for local development, with an optional configured database URL.

## Demo

[Watch or download the demo video](demo-video/inventory-management-demo.mp4).

## Features

- Dashboard with inventory and sales summaries
- Product, supplier, and customer management
- Order entry, order cancellation, and bill generation
- Inventory transactions and low-stock tracking
- Sales and profit reporting
- JWT authentication and role-based access for administrative features
- Supplier PDF import

## Technology

- Frontend: React, Vite, Tailwind CSS
- Backend: Python, Flask, SQLAlchemy, Flask-JWT-Extended
- Database: SQLite by default; configurable through `DATABASE_URL`

## Local development

Prerequisites: Node.js/npm and Python 3.

1. Install frontend dependencies:

   ```bash
   npm install --prefix frontend
   ```

2. Create and install the backend environment:

   ```bash
   python3 -m venv backend/venv
   backend/venv/bin/pip install -r backend/requirements.txt
   ```

3. Configure the backend. The app uses SQLite if `DATABASE_URL` is unset. For local development, create `backend/.env` with private values for at least:

   ```dotenv
   SECRET_KEY=replace-with-a-private-random-value
   JWT_SECRET_KEY=replace-with-a-different-private-random-value
   DEFAULT_ADMIN_EMAIL=admin@example.com
   DEFAULT_ADMIN_PASSWORD=replace-with-a-strong-password
   CORS_ORIGINS=http://localhost:5173
   ```

   To use another database, set `DATABASE_URL` to its SQLAlchemy connection URL.

4. Initialize the database and start the backend:

   ```bash
   cd backend
   ./venv/bin/python init_db.py
   ./venv/bin/python app.py
   ```

5. In another terminal, start the frontend:

   ```bash
   cd frontend
   npm run dev
   ```

   Open the local URL printed by Vite. Its development server proxies `/api` requests to the Flask server at `http://127.0.0.1:5000`.

## Tests and checks

Run backend tests from the repository root:

```bash
backend/venv/bin/python -m pytest backend/tests
```

Build and lint the frontend:

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
```
