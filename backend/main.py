from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from typing import Literal
import models
from database import engine, get_db
import datetime
import calendar

# Create database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Blooming Barrels API", version="1.0.0")

# C-3: CORS restricted to frontend dev server (was allow_origins=["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- VALID ACCOUNT NAMES ---
VALID_ACCOUNTS = ['Cash in Hand', 'Bank Account', 'COD Pending']

# --- Pydantic Schemas with Validation (C-4, C-5) ---

class TransactionCreate(BaseModel):
    type: Literal['Income', 'Expense']                  # C-4: Enum validation
    amount: float
    category: str
    description: str | None = None
    account_name: str = 'Cash in Hand'

    @field_validator('amount')                           # C-5: Positive amount
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than zero')
        return round(v, 2)

    @field_validator('account_name')                     # C-4: Valid account
    @classmethod
    def account_must_be_valid(cls, v):
        if v not in ['Cash in Hand', 'Bank Account', 'COD Pending']:
            raise ValueError(f'Invalid account. Must be one of: Cash in Hand, Bank Account, COD Pending')
        return v

    @field_validator('category')
    @classmethod
    def category_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Category cannot be empty')
        return v.strip()

class TransactionUpdate(BaseModel):
    amount: float

    @field_validator('amount')                           # C-5: Positive amount
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Amount must be greater than zero')
        return round(v, 2)

class TransferCreate(BaseModel):
    from_account: str
    to_account: str
    amount: float
    description: str | None = None
    date: datetime.datetime | None = None

    @field_validator('amount')                           # C-5: Positive amount
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Transfer amount must be greater than zero')
        return round(v, 2)

    @field_validator('from_account', 'to_account')       # C-4: Valid accounts
    @classmethod
    def account_must_be_valid(cls, v):
        if v not in ['Cash in Hand', 'Bank Account', 'COD Pending']:
            raise ValueError(f'Invalid account. Must be one of: Cash in Hand, Bank Account, COD Pending')
        return v

class CustomerCreate(BaseModel):
    name: str
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    dob: str | None = None
    gender: str | None = None
    total_orders: int = 0
    total_spent: float = 0.0

class CustomerUpdate(BaseModel):
    name: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    dob: str | None = None
    gender: str | None = None
    total_orders: int | None = None
    total_spent: float | None = None

class OrderRecord(BaseModel):
    customer_name: str
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    gender: str | None = None
    amount: float

# --- Helper: UTC now (L-5) ---
def utc_now():
    return datetime.datetime.now(datetime.UTC)


@app.get("/")
def read_root():
    return {"status": "success", "message": "API is running smoothly!"}

# 1. Aluth transaction ekak database ekata save karana POST route eka
@app.post("/api/transactions")
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    new_tx = models.Transaction(
        type=transaction.type,
        amount=transaction.amount,
        category=transaction.category,
        description=transaction.description,
        account_name=transaction.account_name
    )
    db.add(new_tx)
    db.commit()          
    db.refresh(new_tx)   
    
    return {"status": "success", "data": new_tx}

# 2. Update transaction amount (Sales & Orders Ledger eke edit karanna)
@app.put("/api/transactions/{transaction_id}")
def update_transaction(transaction_id: int, transaction: TransactionUpdate, db: Session = Depends(get_db)):
    db_tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db_tx.amount = transaction.amount
    db.commit()
    db.refresh(db_tx)
    return {"status": "success", "data": db_tx}

# 3. M-1: Pagination added (skip/limit query params)
@app.get("/api/transactions")
def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(0, ge=0),          # 0 = return all (backwards compatible)
    db: Session = Depends(get_db)
):
    query = db.query(models.Transaction).order_by(models.Transaction.date.desc())
    if limit > 0:
        query = query.offset(skip).limit(limit)
    transactions = query.all()
    return {"status": "success", "data": transactions}

# 4. Transfer between accounts - creates debit + credit pair
@app.post("/api/transfer")
def create_transfer(transfer: TransferCreate, db: Session = Depends(get_db)):
    if transfer.from_account == transfer.to_account:
        raise HTTPException(status_code=400, detail="Source and destination accounts cannot be the same")

    desc = transfer.description or f"Transfer from {transfer.from_account} to {transfer.to_account}"

    # H-4: Improved Month End Settlement date logic
    if transfer.date:
        tx_date = transfer.date
    elif desc == 'Month End Settlement':
        now = utc_now()
        last_day = calendar.monthrange(now.year, now.month)[1]
        tx_date = datetime.datetime(now.year, now.month, last_day, 23, 59, 59, tzinfo=datetime.UTC)
    else:
        tx_date = utc_now()

    # H-2: Explicit try/except for atomicity
    try:
        # Debit from source account
        debit_tx = models.Transaction(
            type='Expense',
            amount=transfer.amount,
            category='Account Transfer',
            description=desc,
            account_name=transfer.from_account,
            date=tx_date
        )
        # Credit into destination account
        credit_tx = models.Transaction(
            type='Income',
            amount=transfer.amount,
            category='Account Transfer',
            description=desc,
            account_name=transfer.to_account,
            date=tx_date
        )

        db.add(debit_tx)
        db.add(credit_tx)
        db.commit()
        db.refresh(debit_tx)
        db.refresh(credit_tx)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Transfer failed: {str(e)}")

    return {"status": "success", "data": {"debit": debit_tx, "credit": credit_tx}}

# H-7: Delete transaction — also deletes paired transfer if applicable
@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # H-7: If this is an Account Transfer, find and delete the paired transaction
    if transaction.category == 'Account Transfer':
        paired_type = 'Income' if transaction.type == 'Expense' else 'Expense'
        paired = db.query(models.Transaction).filter(
            models.Transaction.category == 'Account Transfer',
            models.Transaction.description == transaction.description,
            models.Transaction.date == transaction.date,
            models.Transaction.amount == transaction.amount,
            models.Transaction.type == paired_type,
            models.Transaction.id != transaction.id
        ).first()
        if paired:
            db.delete(paired)
    
    db.delete(transaction)
    db.commit()
    return {"status": "success", "message": "Transaction deleted successfully"}

# --- CUSTOMER CRUD & SYNC ENDPOINTS ---

@app.get("/api/customers")
def get_customers(db: Session = Depends(get_db)):
    customers = db.query(models.Customer).order_by(models.Customer.name.asc()).all()
    return {"status": "success", "data": customers}

@app.post("/api/customers")
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    # M-7: Strip whitespace before ilike check
    clean_name = customer.name.strip() if customer.name else ""
    if not clean_name:
        raise HTTPException(status_code=400, detail="Customer name cannot be empty")
    
    existing = db.query(models.Customer).filter(models.Customer.name.ilike(clean_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="A customer with this name already exists")
    
    new_customer = models.Customer(
        name=clean_name,
        address_line1=customer.address_line1,
        address_line2=customer.address_line2,
        city=customer.city,
        dob=customer.dob,
        gender=customer.gender,
        total_orders=customer.total_orders,
        total_spent=customer.total_spent
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return {"status": "success", "data": new_customer}

@app.put("/api/customers/{customer_id}")
def update_customer(customer_id: int, customer_data: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    update_data = customer_data.model_dump(exclude_unset=True)
        
    if "name" in update_data and update_data["name"] is not None:
        # M-7: Strip whitespace before ilike check
        clean_name = update_data["name"].strip()
        existing = db.query(models.Customer).filter(
            models.Customer.name.ilike(clean_name),
            models.Customer.id != customer_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="A customer with this name already exists")
        customer.name = clean_name
        
    if "address_line1" in update_data:
        customer.address_line1 = update_data["address_line1"]
    if "address_line2" in update_data:
        customer.address_line2 = update_data["address_line2"]
    if "city" in update_data:
        customer.city = update_data["city"]
    if "dob" in update_data:
        customer.dob = update_data["dob"]
    if "gender" in update_data:
        customer.gender = update_data["gender"]
    if "total_orders" in update_data:
        customer.total_orders = update_data["total_orders"]
    if "total_spent" in update_data:
        customer.total_spent = update_data["total_spent"]
        
    db.commit()
    db.refresh(customer)
    return {"status": "success", "data": customer}

@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"status": "success", "message": "Customer deleted successfully"}

@app.post("/api/customers/record-order")
def record_customer_order(order: OrderRecord, db: Session = Depends(get_db)):
    # Trim whitespace and validate customer name
    cust_name = order.customer_name.strip() if order.customer_name else ""
    if not cust_name:
        raise HTTPException(status_code=400, detail="Customer name cannot be empty")

    # Look up customer case-insensitively
    customer = db.query(models.Customer).filter(
        models.Customer.name.ilike(cust_name)
    ).first()
    
    # M-6: Use UTC date consistently (was datetime.date.today() which uses local time)
    today_str = utc_now().strftime('%Y-%m-%d')
    
    # Helper to strip helper strings safely
    def clean_str(s: str | None) -> str | None:
        if s is None:
            return None
        trimmed = s.strip()
        return trimmed if trimmed else None

    addr1 = clean_str(order.address_line1)
    addr2 = clean_str(order.address_line2)
    city_val = clean_str(order.city)
    gender_val = clean_str(order.gender)

    if customer:
        customer.total_orders += 1
        customer.total_spent += order.amount
        customer.last_order = today_str
        if addr1:
            customer.address_line1 = addr1
        if addr2:
            customer.address_line2 = addr2
        if city_val:
            customer.city = city_val
        if gender_val:
            customer.gender = gender_val
    else:
        customer = models.Customer(
            name=cust_name,
            address_line1=addr1,
            address_line2=addr2,
            city=city_val,
            gender=gender_val or 'Other',
            total_orders=1,
            total_spent=order.amount,
            last_order=today_str
        )
        db.add(customer)
        
    db.commit()
    db.refresh(customer)
    return {"status": "success", "data": customer}