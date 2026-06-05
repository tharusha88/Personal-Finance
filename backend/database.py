import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Read database URL from environment variable
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,                    # Query eka run karanna kalin connection eka live da balanawa
    pool_recycle=300,                      # Vinadi 5n 5ta connection eka aluth karanawa
    connect_args={"sslmode": "require"}    # Supabase cloud ekata SSL aniwaren oni
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()