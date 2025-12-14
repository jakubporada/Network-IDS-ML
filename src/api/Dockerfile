FROM python:3.11-slim

WORKDIR /app

# Retry apt install with different Debian mirrors if needed
RUN apt-get update || true && \
    apt-get install -y --fix-missing \
    gcc \
    curl \
    || apt-get install -y --allow-unauthenticated gcc curl || true && \
    rm -rf /var/lib/apt/lists/*

COPY ./src/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./src/api/main.py .
COPY ./src/api/vpc_parser.py .

COPY ./models ./models

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]