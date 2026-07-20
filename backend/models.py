from sqlalchemy import Column, Integer, String, Numeric, DateTime, Index
from database import Base
import datetime


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True)  # 'Income' hari 'Expense'
    amount = Column(Numeric(12, 2))    # H-1: Numeric for precision (was Float)
    category = Column(String, index=True)          # L-7: Added index
    description = Column(String, nullable=True)
    account_name = Column(String, default='Cash in Hand', server_default='Cash in Hand', index=True)  # L-7: Added index
    date = Column(DateTime, default=lambda: datetime.datetime.now(datetime.UTC), index=True)  # L-5 + L-7: Fixed utcnow + index


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
    total_spent = Column(Numeric(12, 2), default=0.0)  # H-1: Numeric for precision
    last_order = Column(String, nullable=True)  # Format: "YYYY-MM-DD"