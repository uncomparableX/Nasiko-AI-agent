import os
import json
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI(title="Interviewer Scheduler Agent")

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class SchedulingRequest(BaseModel):
    candidate_name: str
    interviewer_name: str
    interviewer_availability: List[str]  # e.g., ["2026-03-10 10:00-11:00", "2026-03-11 14:00-15:00"]
    interview_type: Optional[str] = "Technical Interview"

class ProposedSlot(BaseModel):
    start_time: str
    end_time: str
    description: str

class SchedulingResponse(BaseModel):
    proposed_slots: List[ProposedSlot]
    email_draft: str

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/schedule", response_model=SchedulingResponse)
async def propose_slots(request: SchedulingRequest):
    try:
        # Use LLM to propose slots and draft an email
        prompt = f"""
        Propose interview slots for {request.candidate_name} with {request.interviewer_name} for a {request.interview_type}.
        The interviewer's availability is: {", ".join(request.interviewer_availability)}.
        
        Provide:
        1. A list of finalized "proposed_slots" with start_time, end_time, and a brief description.
        2. A professional "email_draft" to the candidate inviting them to choose one of these slots.
        
        Return the result as a JSON object.
        """
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a recruitment coordinator. Your goal is to schedule interviews efficiently and professionally."},
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
