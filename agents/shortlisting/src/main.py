import os
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI(title="Shortlisting Agent")

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ScoredCandidate(BaseModel):
    name: str
    email: str
    score: float
    justification: str

class ShortlistingRequest(BaseModel):
    candidates: List[ScoredCandidate]
    job_description: str
    target_count: Optional[int] = 3

class ShortlistedCandidate(BaseModel):
    name: str
    email: str
    recommendation: str  # Recommended, Maybe, Not Recommended
    final_justification: str

class ShortlistingResponse(BaseModel):
    shortlist: List[ShortlistedCandidate]
    overall_summary: str

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/shortlist", response_model=ShortlistingResponse)
async def shortlist_candidates(request: ShortlistingRequest):
    try:
        # Use LLM to shortlist candidates
        prompt = f"""
        Review the following scored candidates for the job description provided.
        Provide a final recommendation for each candidate: "Recommended", "Maybe", or "Not Recommended".
        Aim to find approximately {request.target_count} "Recommended" candidates if they meet the quality bar.
        
        Job Description:
        {request.job_description}
        
        Candidates:
        {json.dumps([c.dict() for c in request.candidates], indent=2)}
        
        Return the result as a JSON object with:
        1. "shortlist": A list of objects with "name", "email", "recommendation", and "final_justification".
        2. "overall_summary": A brief summary of the shortlisting process.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a senior hiring manager. Your goal is to select the best candidates from a pre-scored list for final interviews."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
