FROM python:3.12-slim
RUN pip install --no-cache-dir flask flask-socketio paho-mqtt
WORKDIR /app
COPY requirements.txt .
COPY app.py .
COPY templates/ templates/
COPY static/ static/
EXPOSE 5860
CMD ["python", "-u", "app.py"]
