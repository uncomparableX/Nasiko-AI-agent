FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install .

COPY src/ ./src/
COPY Agentcard.json .

EXPOSE 5000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5000"]
