from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Oya copy karagaththu link eka methana danna (Quotes " " athule)
SQLALCHEMY_DATABASE_URL = "postgresql://postgres.mrxknagisuehfnmvjjvg:AYF$kpT!aC2P7uk@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

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