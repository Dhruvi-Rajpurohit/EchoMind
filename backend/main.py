import os
import json
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta
from groq import Groq
from dotenv import load_dotenv
from passlib.context import CryptContext
import jwt

load_dotenv()

app = FastAPI(title="EchoMind AI Enterprise Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration Setup
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MONGO_DETAILS = os.getenv("MONGO_URI", "mongodb://localhost:27017")
SECRET_KEY = os.getenv("JWT_SECRET", "super_secret_internship_key_99x!")
ALGORITHM = "HS256"

# Cryptography Context for Hashing Passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# MongoDB Structural Collections
db_client = MongoClient(MONGO_DETAILS)
db = db_client.echomind_db
entries_collection = db.get_collection("entries")
users_collection = db.get_collection("users")

# --- PYDANTIC STRUCTS ---
class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class JournalInput(BaseModel):
    content: str

# --- AUTH UTILS ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials session. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        user = users_collection.find_one({"email": email})
        if user is None:
            raise credentials_exception
        user["_id"] = str(user["_id"])
        return user
    except jwt.PyJWTError:
        raise credentials_exception

# --- EXPERT SYSTEM PROMPT ---
SYSTEM_PROMPT = """
You are the EchoMind Emotional Parser Engine. Analyze the journal text and return a valid JSON object ONLY.
Do not use markdown blocks or formatting wrappers.

Template:
{
  "overall_sentiment": "Positive" | "Negative" | "Neutral",
  "confidence_score": 0.85, 
  "emotions": { "joy": 0.0, "anxiety": 0.0, "sadness": 0.0, "anger": 0.0, "serenity": 0.0 },
  "themes": ["string"],
  "summary": "1 sentence breakdown."
}
Scale emotions and confidence between 0.0 and 1.0.
"""

# --- ROUTERS: AUTHENTICATION PIPELINE ---
@app.post("/api/auth/signup", status_code=201)
def sign_up_user(user_data: UserSignUp):
    existing_user = users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    hashed = hash_password(user_data.password)
    # Define IST for creation timestamps
    ist_zone = timezone(timedelta(hours=5, minutes=30))
    new_user = {
        "email": user_data.email,
        "password": hashed,
        "name": user_data.name,
        "created_at": datetime.now(ist_zone)
    }
    users_collection.insert_one(new_user)
    return {"status": "success", "message": "Account created successfully!"}

@app.post("/api/auth/login", response_model=TokenResponse)
def login_user(credentials: UserLogin):
    user = users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password credentials.")
    
    token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"email": user["email"], "name": user["name"]}
    }

# --- ROUTERS: JOURNAL PIPELINE ---
@app.post("/api/journal/analyze")
def analyze_journal_entry(data: JournalInput, current_user: dict = Depends(get_current_user)):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Journal entry cannot be empty.")
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key missing from server environment.")
        
    try:
        word_count = len(data.content.split())
        
        # Explicit Indian Standard Time (IST) Offset calculation
        ist_zone = timezone(timedelta(hours=5, minutes=30))
        current_time_ist = datetime.now(ist_zone)
        
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": data.content}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        analysis_dict = json.loads(response.choices[0].message.content)
        
        document = {
            "user_id": current_user["email"],
            "content": data.content,
            "created_at": current_time_ist.isoformat(), # Store directly as ISO string containing IST layout
            "patterns": {
                "word_count": word_count,
                "hour_of_day": current_time_ist.hour
            },
            "analysis": analysis_dict
        }
        
        result = entries_collection.insert_one(document)
        return {"status": "success", "id": str(result.inserted_id), "analysis": analysis_dict}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/journal/history")
def get_journal_history(current_user: dict = Depends(get_current_user)):
    try:
        cursor = entries_collection.find({"user_id": current_user["email"]}).sort("_id", -1)
        history_list = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            history_list.append(doc)
        return {"status": "success", "data": history_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))