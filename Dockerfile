FROM python:3.10-slim

WORKDIR /app

# 1. Install system prerequisites
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 2. Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# 3. FIX: Install MATCHING torch and torchvision CPU versions together
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 4. Install the web routing framework and headless YOLO components
RUN pip install --no-cache-dir flask flask-socketio ultralytics-opencv-headless

# 5. Move project files in place
COPY app.py .
COPY customYolo.pt .
COPY static/ ./static
COPY templates/ ./templates

EXPOSE 5000

CMD ["python", "app.py"]
