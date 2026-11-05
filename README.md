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

## Business workspaces

The SaaS foundation supports business registration, multiple businesses per
user, workspace switching, business-specific roles, and tenant-scoped access to
the existing inventory APIs. New users can create an owner account and initial
business from the sign-in page. Existing databases must be backed up and
migrated from `backend/` with `flask db upgrade`; the migration assigns legacy
inventory records and users to one default business.

Authenticated API requests select a workspace with `X-Business-Id`. The
frontend sets this header from the active business selector.

Customers can create a separate portal account for a business using its
workspace slug at `/portal/login`, then review their own order history at
`/portal/dashboard`. Portal credentials are separate from staff accounts.
Existing customer records must have portal access activated by a business
administrator; the one-time temporary password is shown once and must be
changed at first sign-in.

### Shop-specific workspaces and storefronts

Each business has a shop URL based on its unique slug. Owners sign in and work
within that shop at `/shop/<slug>` (for example, `/shop/corner-shop`), with
storefront options at `/shop/<slug>/settings`. Customers can browse the public
catalogue at `/shop/<slug>/customer`, create or sign in to a customer account,
and manage that shop's profile, cart, checkout, orders, and receipts there.

Customer accounts can be reused across shops, while each shop keeps its own
customer profile and order history. Public catalogues expose available products
and selling prices, not inventory quantities, supplier details, or purchase
costs. Disabling a shop's storefront prevents public browsing and ordering but
does not disable the owner's private workspace. The earlier `/portal` customer
experience remains available for accounts activated by a shop administrator.

Platform administrators sign in at `/platform-admin/login`. The platform-only
console includes shop owner accounts, business registrations and access status,
manual subscription plans and assignments, aggregated enrollment summaries,
technical health, internal support cases, and an administrative audit log.
Suspending an owner account or business blocks access while preserving records.
Plan prices are catalog values only; payment collection and automated billing
are not implemented.

Platform administration uses a separate session from business sign-in:
platform sessions cannot access business APIs, and business sessions cannot
access platform administration APIs. Owner contact and workspace enrollment
details are available to platform administrators, but tenant sales, profit,
products, customers, and orders are not exposed in the platform console.
Access is restricted to emails listed in `PLATFORM_ADMIN_EMAILS`; configure
this allowlist explicitly for deployments. The development default uses
`DEFAULT_ADMIN_EMAIL`.

After upgrading an existing database with `flask db upgrade`, the platform
administrator can create plans and assign them to registered businesses. The
same migration creates tables for internal support cases and platform audit
events.

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
   PLATFORM_ADMIN_EMAILS=admin@example.com
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
