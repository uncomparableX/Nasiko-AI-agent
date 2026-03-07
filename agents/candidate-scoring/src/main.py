import os
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI(title="Candidate Scoring Agent")

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ScoringRequest(BaseModel):
    candidate_data: dict
    job_description: str

class ScoringResponse(BaseModel):
    score: float
    justification: str
    strengths: List[str]
    weaknesses: List[str]

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/score", response_model=ScoringResponse)
async def score_candidate(request: ScoringRequest):
    try:
        # Use LLM to score the candidate against the JD
        prompt = f"""
        Evaluate the following candidate against the provided job description.
        Provide a score from 0 to 100 based on fit.
        Also provide a justification, a list of strengths, and a list of weaknesses.
        
        Job Description:
        {request.job_description}
        
        Candidate Data:
        {json.dumps(request.candidate_data, indent=2)}
        
        Return the result as a JSON object with keys: score, justification, strengths, weaknesses.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert HR recruiter and technical evaluator. Your goal is to provide accurate and objective scores for candidates against job descriptions."},
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
