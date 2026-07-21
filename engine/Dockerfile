FROM python:3.11-slim

# Install system dependencies (FFmpeg and Chromaprint fpcalc for audio fingerprinting)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libchromaprint-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy matching engine code
COPY app.py fingerprint.py index.py ./

# Expose FastAPI port
EXPOSE 4318

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4318", "--workers", "2"]
