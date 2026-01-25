# Use a slim Python image
FROM python:3.11-slim

# Install system dependencies (ping utility is crucial)
RUN apt-get update && \
    apt-get install -y --no-install-recommends iputils-ping && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ /app/backend/

# Copy frontend code
COPY frontend/ /app/frontend/

# Set working directory to backend for execution
WORKDIR /app/backend

# Expose port
EXPOSE 8000

# Run the application
# We use python -m uvicorn to ensure it picks up the local path correctly
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
