from models import db, User
from utils.security import hash_password
from app import app
from config import Config

with app.app_context():
    db.create_all()

    admin = User.query.filter_by(email=Config.DEFAULT_ADMIN_EMAIL.lower()).first()
    if not admin:
        admin = User(
            name="Admin",
            email=Config.DEFAULT_ADMIN_EMAIL.lower(),
            password_hash=hash_password(Config.DEFAULT_ADMIN_PASSWORD),
            is_active=True,
            role="admin",
        )
        db.session.add(admin)
        db.session.commit()
        print(f"Admin user created: {Config.DEFAULT_ADMIN_EMAIL}")
    else:
        print(f"Admin user already exists: {Config.DEFAULT_ADMIN_EMAIL}")

print("Database initialized!")
