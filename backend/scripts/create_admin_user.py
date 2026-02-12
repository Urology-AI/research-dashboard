"""
Script to create an initial admin user
Run this after setting up the database to create your first admin account
"""
import sys
import os
# Add parent directory to path so scripts can import from backend modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import SessionLocal, engine, Base
from models import User, UserRole

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Check if admin already exists
    admin = db.query(User).filter(User.username == 'admin').first()
    if admin:
        print("Admin user already exists!")
        print(f"Username: {admin.username}")
        print(f"Email: {admin.email}")
        response = input("Do you want to reset the password? (y/n): ")
        if response.lower() == 'y':
            new_password = input("Enter new password: ")
            admin.hashed_password = User.hash_password(new_password)
            db.commit()
            print("Password updated successfully!")
    else:
        print("Creating admin user...")
        username = input("Enter username (default: admin): ").strip() or "admin"
        email = input("Enter email: ").strip()
        password = input("Enter password: ").strip()
        full_name = input("Enter full name (optional): ").strip() or None

        if not email or not password:
            print("Error: Email and password are required!")
            exit(1)
        
        # Validate password length (bcrypt limit is 72 bytes)
        if len(password.encode('utf-8')) > 72:
            print("Error: Password is too long (maximum 72 bytes). Please use a shorter password.")
            exit(1)

        # Check if email or username already exists
        if db.query(User).filter(User.email == email).first():
            print(f"Error: Email {email} already exists!")
            exit(1)
        if db.query(User).filter(User.username == username).first():
            print(f"Error: Username {username} already exists!")
            exit(1)

        admin = User(
            username=username,
            email=email,
            hashed_password=User.hash_password(password),
            full_name=full_name,
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("\n✓ Admin user created successfully!")
        print(f"  Username: {username}")
        print(f"  Email: {email}")
        print(f"  Role: Admin")
        print("\nYou can now login with these credentials.")

except Exception as e:
    db.rollback()
    print(f"Error creating admin user: {e}")
finally:
    db.close()
