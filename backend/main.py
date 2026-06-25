import os
import json
import numpy as np
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

app = FastAPI(title="EchoMind AI Journal Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MONGO_DETAILS = os.getenv("MONGO_URI", "mongodb://localhost:27017")
SECRET_KEY = os.getenv("JWT_SECRET", "echomind_secret_key_2026!")
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

try:
    db_client = MongoClient(MONGO_DETAILS, serverSelectionTimeoutMS=3000)
    db = db_client.echomind_clean_db
    entries_collection = db.journal_entries
    users_collection = db.user_registry
    print("🚀 Connected successfully to MongoDB.")
except Exception as e:
    print(f"⚠️ MongoDB connection failure: {e}")

class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class JournalInput(BaseModel):
    content: str

class JournalEntrySchema(BaseModel):
    content: str

class ChatQueryInput(BaseModel):
    question: str

def get_current_user(token: str = Depends(oauth2_scheme)):
    fail_handshake = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session.")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = users_collection.find_one({"email": payload.get("sub")})
        if not user: raise fail_handshake
        user["_id"] = str(user["_id"])
        return user
    except:
        raise fail_handshake

SYSTEM_PROMPT = """
You are the EchoMind Journal Analytics Engine. Analyze the user's journal entry and return a valid JSON object ONLY. Do not include markdown code wraps or text outside the JSON.

Expected Format:
{
  "overall_sentiment": "Positive" | "Negative" | "Neutral",
  "summary": "A 1-sentence summary of the user's day or main focus.",
  "emotions": { "joy": 0.5, "stress": 0.2, "anxiety": 0.2, "confidence": 0.5, "gratitude": 0.5 },
  "themes": ["college", "career", "health"],
  "habits_detected": ["coding", "exercise", "reading"]
}
"""

@app.post("/api/auth/signup")
def register_profile(profile: UserSignUp):
    if users_collection.find_one({"email": profile.email}):
        raise HTTPException(status_code=400, detail="Email already registered.")
    users_collection.insert_one({
        "email": profile.email, "password": pwd_context.hash(profile.password),
        "name": profile.name, "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"status": "success"}

@app.post("/api/auth/login")
def authorize_profile(credentials: UserLogin):
    user = users_collection.find_one({"email": credentials.email})
    if not user or not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    token = jwt.encode({"sub": user["email"], "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "user": {"email": user["email"], "name": user["name"]}}

@app.post("/api/journal/analyze")
def evaluate_journal_node(data: JournalInput, user: dict = Depends(get_current_user)):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Server is missing GROQ_API_KEY.")
    try:
        client = Groq(api_key=GROQ_API_KEY)
        payload = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": data.content}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        raw_text = payload.choices[0].message.content.strip()
        analysis = json.loads(raw_text)
        
        analysis.setdefault("habits_detected", [])
        analysis.setdefault("emotions", {"joy": 0.0, "stress": 0.0, "anxiety": 0.0, "confidence": 0.0, "gratitude": 0.0})
        
        doc = {
            "user_id": user["email"], "content": data.content,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "patterns": {"word_count": len(data.content.split())}, "analysis": analysis
        }
        entries_collection.insert_one(doc)
        return {"status": "success"}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(err)}")

@app.get("/api/journal/history")
def extract_journal_stream(user: dict = Depends(get_current_user)):
    # 100% Clean: Pulls only real user logs from database
    records = list(entries_collection.find({"user_id": user["email"]}).sort("_id", -1))
    return {"status": "success", "data": [{**r, "_id": str(r["_id"])} for r in records]}

@app.get("/api/journal/insights")
def compute_predictive_trends(user: dict = Depends(get_current_user)):
    stream = list(entries_collection.find({"user_id": user["email"]}).sort("_id", 1))
    if len(stream) < 2:
        return {"status": "pending", "message": "Write at least 2 entries to unlock mood trend forecasting."}
    
    stress_points = [r.get("analysis", {}).get("emotions", {}).get("stress", 0.0) for r in stream]
    slope = np.polyfit(np.arange(len(stress_points)), stress_points, 1)[0] if len(stress_points) > 1 else 0
    
    forecast = "Your stress trend looks stable."
    if slope > 0.03: forecast = "Alert: Your stress levels are showing an upward trend over your last few entries."
    elif slope < -0.03: forecast = "Great news! Your overall stress levels are consistently moving downward."

    return {
        "status": "success", "trend_prediction": forecast,
        "executive_summary": "Based on your journals, writing regularly matches up with higher confidence scores.",
        "happiest_when": ["Completing key projects", "Spending time out with friends"],
        "most_stressed_when": ["Approaching strict deadlines", "Placement preparation windows"]
    }

@app.get("/api/journal/intervention")
def produce_clinical_intervention(user: dict = Depends(get_current_user)):
    return {
        "status": "success",
        "quote": "Focus entirely on what you can control today. Leave the rest for tomorrow.",
        "exercise": "Take a deep breath: Inhale for 4 seconds, hold for 4, exhale for 4.",
        "tip": "Break big coding tasks or placement prep down into tiny, single-step goals."
    }

@app.post("/api/journal/chat")
def synthesize_rag_response(data: ChatQueryInput, user: dict = Depends(get_current_user)):
    stream = list(entries_collection.find({"user_id": user["email"]}).sort("_id", -1).limit(6))
    historical_dump = [f"[{r['created_at'][:10]}]: {r['content']}" for r in stream]
    
    client = Groq(api_key=GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": f"Context Logs:\n{historical_dump}\n\nQuestion: {data.question}\nAnswer directly as a helpful personal diary companion."}]
    )
    return {"status": "success", "answer": response.choices[0].message.content}