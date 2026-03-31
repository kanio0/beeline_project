from app.db.session import SessionLocal
from app.db.seed import seed_database

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
