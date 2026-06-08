This folder is reserved for Flask-Migrate/Alembic files.

Initialize and generate migrations from `backend/`:

```bash
flask db init
flask db migrate -m "initial inventory schema"
flask db upgrade
```

The canonical SQLAlchemy model definitions live in `backend/models/entities.py`.
`backend/database/schema.sql` is included as a MySQL schema reference.

