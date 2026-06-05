from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
import datetime

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True)  # 'Income' hari 'Expense'
    amount = Column(Float)
    category = Column(String)          # 'Food', 'Blooming Barrels' wage
    description = Column(String, nullable=True)
    date = Column(DateTime, default=datetime.datetime.utcnow)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, unique=True)
    address_line1 = Column(String, nullable=True)
    address_line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    dob = Column(String, nullable=True)  # Format: "YYYY-MM-DD"
    gender = Column(String, nullable=True)
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    last_order = Column(String, nullable=True)  # Format: "YYYY-MM-DD"