Alembic migration scripts are stored in `migrations/alembic`.

Back up the database before applying migrations. From `backend/`, apply migrations:

```bash
flask db upgrade
```

The first migration assigns existing inventory records to one legacy business
and creates memberships for existing users. New accounts can register with
`POST /api/auth/register`; authenticated users can create and list businesses at
`/api/businesses`. Business data endpoints select membership context with the
`X-Business-Id` request header. The frontend stores the selected business and
sends this header automatically.

The tenancy migration intentionally refuses automatic downgrade because that
would discard business ownership and membership data.

The ownership hardening migration makes `business_id` mandatory on every
tenant-scoped table. It stops with an error instead of guessing if any rows
lack a business assignment.

Customer portal credentials are stored as password hashes on the matching
business-scoped customer record. The portal migration adds this nullable field
so existing customer records remain usable without creating portal accounts.
Administrators can issue portal access to an existing customer; issued
temporary passwords are required to be changed on first sign-in.

For a new local database, run `python init_db.py` to create the inventory schema
and seed the configured administrator, then run `flask db upgrade`.

Generate future migrations with `flask db migrate -m "describe the schema
change"`, review the generated script, and then apply it with `flask db upgrade`.
The canonical SQLAlchemy model definitions live in `models/entities.py`.
`database/schema.sql` is included as a MySQL schema reference.
