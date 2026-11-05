import hashlib
import hmac
import time
from functools import wraps

from flask import current_app, request
from sqlalchemy import delete, select
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from models import RateLimitBucket, db
from utils.errors import ApiError


def rate_limit(max_requests, window_seconds):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            now = int(time.time())
            window_start = now - now % window_seconds
            identity = f"{request.endpoint}:{request.remote_addr or 'unknown'}:{window_start}"
            digest = hmac.new(
                current_app.config["SECRET_KEY"].encode("utf-8"),
                identity.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            table = RateLimitBucket.__table__
            values = {
                "key": digest,
                "request_count": 1,
                "window_started_at": window_start,
            }
            dialect = db.engine.dialect.name

            if dialect == "mysql":
                statement = mysql_insert(table).values(**values).on_duplicate_key_update(
                    request_count=table.c.request_count + 1
                )
            elif dialect == "sqlite":
                statement = sqlite_insert(table).values(**values).on_conflict_do_update(
                    index_elements=["key"],
                    set_={"request_count": table.c.request_count + 1},
                )
            else:
                raise RuntimeError(f"Rate limiting is not configured for {dialect}.")

            db.session.execute(statement)
            count = db.session.execute(
                select(table.c.request_count).where(table.c.key == digest)
            ).scalar_one()
            if int(digest[:2], 16) == 0:
                db.session.execute(
                    delete(table).where(table.c.window_started_at < now - 86400)
                )
            db.session.commit()

            if count > max_requests:
                retry_after = max(1, window_start + window_seconds - now)
                raise ApiError(
                    "Too many attempts. Please wait before trying again.",
                    429,
                    {"retryAfter": retry_after},
                    headers={"Retry-After": str(retry_after)},
                )
            return fn(*args, **kwargs)

        return wrapper

    return decorator
