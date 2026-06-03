FROM python:3.10-slim

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy necessary files from build context (workspace root)
COPY backend/ ./backend/
COPY compiler_api/ ./compiler_api/
COPY grammar.lark .

# Expose the API port
EXPOSE 5001

# Run Flask using a multi-worker Gunicorn server
WORKDIR /app/compiler_api
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5001", "app:app"]
