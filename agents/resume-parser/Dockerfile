FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for PDF parsing if needed
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install .

COPY src/ ./src/
COPY Agentcard.json .

EXPOSE 5000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5000"]
