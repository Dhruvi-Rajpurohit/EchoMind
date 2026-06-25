import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv

# Load variables from a .env file if present
load_dotenv()

app = FastAPI(title="EchoMind AI Engine")

# CORS Setup - Essential for React-to-FastAPI communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration Configurations
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MONGO_DETAILS = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Synchronous connection using standard pymongo
db_client = MongoClient(MONGO_DETAILS)
db = db_client.echomind_db
entries_collection = db.get_collection("entries")

# Pydantic input parser
class JournalInput(BaseModel):
    user_id: str
    content: str

SYSTEM_PROMPT = """
You are the EchoMind emotional parsing engine. Analyze the raw journal entry and extract emotional indicators.
Return a strictly valid JSON object ONLY. Do not include markdown code blocks (like ```json).

Template:
{
  "overall_sentiment": "Positive" | "Negative" | "Neutral",
  "emotions": { "joy": 0.0, "anxiety": 0.0, "sadness": 0.0, "anger": 0.0, "serenity": 0.0 },
  "themes": ["string"],
  "summary": "1-2 sentence emotional breakdown."
}
Scale emotions between 0.0 and 1.0.
"""

@app.get("/")
def read_root():
    return {"status": "online", "project": "EchoMind Analyzer API"}

# Endpoint 1: Analyze, Track Patterns, & Store inside MongoDB
@app.post("/api/journal/analyze")
def analyze_journal_entry(data: JournalInput):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Journal entry cannot be empty.")
    
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured on server. Check your .env setup.")
        
    try:
        # 1. Process Writing Patterns and Metrics
        word_count = len(data.content.split())
        current_time = datetime.utcnow()
        hour_of_day = current_time.hour
        
        # 2. Get AI Emotional Analysis via Groq
        client = Groq(api_key=GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": data.content}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content
        analysis_dict = json.loads(raw_content)
        
        # 3. Consolidate into a pattern-tracking Document Schema
        document = {
            "user_id": data.user_id,
            "content": data.content,
            "created_at": current_time,
            "patterns": {
                "word_count": word_count,
                "hour_of_day": hour_of_day
            },
            "analysis": analysis_dict
        }
        
        # Save to database synchronously
        result = entries_collection.insert_one(document)
        
        return {
            "status": "success",
            "id": str(result.inserted_id),
            "content": data.content,
            "patterns": document["patterns"],
            "analysis": analysis_dict
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint 2: Fetch full journal historical logs for patterns calculation
@app.get("/api/journal/history/{user_id}")
def get_journal_history(user_id: str):
    try:
        cursor = entries_collection.find({"user_id": user_id}).sort("created_at", -1)
        
        history_list = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if "created_at" in doc and isinstance(doc["created_at"], datetime):
                doc["created_at"] = doc["created_at"].isoformat()
                
            history_list.append(doc)
            
        return {
            "status": "success",
            "count": len(history_list),
            "data": history_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database retrieval error: {str(e)}")