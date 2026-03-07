import os
import io
import json
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
import pdfplumber
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI(title="Resume Parser Agent")

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ResumeData(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    skills: List[str]
    experience: List[dict]
    education: List[dict]
    summary: Optional[str] = None

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/parse", response_model=ResumeData)
async def parse_resume(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        content = await file.read()
        text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")
        
        # Use LLM to structure the data
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert resume parser. Extract the following information from the resume text and return it as a JSON object: name, email, phone, skills (list of strings), experience (list of objects with title, company, duration, description), education (list of objects with degree, institution, year), and a brief summary."},
                {"role": "user", "content": text}
            ],
            response_format={"type": "json_object"}
        )
        
        structured_data = json.loads(response.choices[0].message.content)
        return structured_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
