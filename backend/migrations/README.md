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

Fresh and existing databases use separate workflows:

- **Empty database:** set `DEFAULT_ADMIN_EMAIL` and a unique
  `DEFAULT_ADMIN_PASSWORD`, then run `flask init-fresh-db` (or
  `python init_db.py`). This creates the current schema from registered models,
  creates the initial administrator/owner membership, and stamps Alembic at its
  current head. Do not run `flask db upgrade` afterward.
- **Existing legacy database:** back it up, inspect its current schema and
  Alembic revision, then run `flask db upgrade`. Do not run `init_db.py` first;
  `create_all()` followed by the historical migrations can duplicate tables
  and columns.

The `database/schema.sql` file documents the legacy MySQL inventory schema and
is not a complete current SaaS schema. Do not use it to create a fresh
production database. Production requires a persistent MySQL URL, strong
application secrets, and an explicit platform-administrator allowlist.

Generate future migrations with `flask db migrate -m "describe the schema
change"`, review the generated script, and then apply it with `flask db upgrade`.
The canonical SQLAlchemy model definitions live in `models/entities.py`.
`database/schema.sql` is included as a MySQL schema reference.
