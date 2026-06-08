from models import db, User
from utils.security import hash_password
from app import app

with app.app_context():
    db.create_all()
    
    # Create admin user if it doesn't exist
    admin = User.query.filter_by(email='admin@example.com').first()
    if not admin:
        admin = User(
            email='admin@example.com',
            password_hash=hash_password('admin123'),
            is_active=True,
            role='admin'
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user created successfully!")
    else:
        print("Admin user already exists!")

print("Database initialized!")
