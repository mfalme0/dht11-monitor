FROM python:3.12-slim
RUN pip install --no-cache-dir pyserial paho-mqtt
WORKDIR /app
COPY serial_to_mqtt.py .
CMD ["python", "-u", "serial_to_mqtt.py"]
