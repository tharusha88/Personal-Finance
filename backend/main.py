from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import engine, get_db
import datetime

# Create database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Blooming Barrels API", version="1.0.0")

# CORS setup (Frontend ekata backend ekath ekka katha karanna denawa)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Frontend eken ena data validate karana Pydantic Schema
class TransactionCreate(BaseModel):
    type: str
    amount: float
    category: str
    description: str | None = None

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
        description=transaction.description
    )
    db.add(new_tx)
    db.commit()          
    db.refresh(new_tx)   
    
    return {"status": "success", "data": new_tx}

# 2. Database eke thiyena okkoma transactions React ekata yawana GET route eka
@app.get("/api/transactions")
def get_transactions(db: Session = Depends(get_db)):
    # Aluthma transactions udin enna order karanawa (descending by date)
    transactions = db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()
    return {"status": "success", "data": transactions}

# 3. Transaction ekak delete karana DELETE route eka (Aluthma eka)
@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
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
    # Check if name already exists case-insensitively
    existing = db.query(models.Customer).filter(models.Customer.name.ilike(customer.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="A customer with this name already exists")
    
    new_customer = models.Customer(
        name=customer.name,
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
        # Check if renaming conflicts with another name
        existing = db.query(models.Customer).filter(
            models.Customer.name.ilike(update_data["name"]),
            models.Customer.id != customer_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="A customer with this name already exists")
        customer.name = update_data["name"]
        
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
    # Look up customer case-insensitively
    customer = db.query(models.Customer).filter(
        models.Customer.name.ilike(order.customer_name)
    ).first()
    
    today_str = datetime.date.today().isoformat()
    
    if customer:
        customer.total_orders += 1
        customer.total_spent += order.amount
        customer.last_order = today_str
        if order.address_line1:
            customer.address_line1 = order.address_line1
        if order.address_line2:
            customer.address_line2 = order.address_line2
        if order.city:
            customer.city = order.city
        if order.gender:
            customer.gender = order.gender
    else:
        customer = models.Customer(
            name=order.customer_name,
            address_line1=order.address_line1,
            address_line2=order.address_line2,
            city=order.city,
            gender=order.gender,
            total_orders=1,
            total_spent=order.amount,
            last_order=today_str
        )
        db.add(customer)
        
    db.commit()
    db.refresh(customer)
    return {"status": "success", "data": customer}