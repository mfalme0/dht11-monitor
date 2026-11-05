import serial
import time
import json
import re
import paho.mqtt.client as mqtt

SERIAL_PORT = "/dev/ttyACM0"
BAUD_RATE = 9600

MQTT_BROKER = "mosquitto"
MQTT_PORT = 1883
MQTT_TOPIC_STATE = "home/dht11/data"
MQTT_TOPIC_DISCOVERY_TEMP = "homeassistant/sensor/dht11_temperature/config"
MQTT_TOPIC_DISCOVERY_HUM = "homeassistant/sensor/dht11_humidity/config"

DEVICE_NAME = "DHT11 Sensor"
DEVICE_ID = "dht11_001"

discovery_payload_temp = {
    "name": "DHT11 Temperature",
    "state_topic": MQTT_TOPIC_STATE,
    "value_template": "{{ value_json.temperature }}",
    "unit_of_measurement": "°C",
    "device_class": "temperature",
    "unique_id": f"{DEVICE_ID}_temperature",
    "device": {
        "identifiers": [DEVICE_ID],
        "name": DEVICE_NAME,
        "manufacturer": "Arduino",
        "model": "Uno + DHT11",
    },
}

discovery_payload_hum = {
    "name": "DHT11 Humidity",
    "state_topic": MQTT_TOPIC_STATE,
    "value_template": "{{ value_json.humidity }}",
    "unit_of_measurement": "%",
    "device_class": "humidity",
    "unique_id": f"{DEVICE_ID}_humidity",
    "device": {
        "identifiers": [DEVICE_ID],
        "name": DEVICE_NAME,
        "manufacturer": "Arduino",
        "model": "Uno + DHT11",
    },
}


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("[MQTT] Connected to broker")
        client.publish(
            MQTT_TOPIC_DISCOVERY_TEMP,
            json.dumps(discovery_payload_temp),
            retain=True,
        )
        client.publish(
            MQTT_TOPIC_DISCOVERY_HUM,
            json.dumps(discovery_payload_hum),
            retain=True,
        )
        print("[MQTT] Discovery messages sent")
    else:
        print(f"[MQTT] Connection failed: {rc}")


def parse_line(line):
    line = line.strip()
    if not line:
        return None
    # Accept both "temperature=21,humidity=50" and "Temperature: 21 °C\tHumidity: 77 %"
    temp = None
    hum = None
    m_temp = re.search(r"temp(?:erature)?\s*[:=]\s*(-?\d+(?:\.\d+)?)", line, re.IGNORECASE)
    m_hum = re.search(r"hum(?:idity)?\s*[:=]\s*(-?\d+(?:\.\d+)?)", line, re.IGNORECASE)
    if m_temp:
        try:
            temp = float(m_temp.group(1))
        except ValueError:
            temp = None
    if m_hum:
        try:
            hum = float(m_hum.group(1))
        except ValueError:
            hum = None
    if temp is not None and hum is not None:
        return {"temperature": temp, "humidity": hum}
    return None


def main():
    print(f"[SERIAL] Opening {SERIAL_PORT} at {BAUD_RATE} baud")
    print(f"[MQTT]  Connecting to {MQTT_BROKER}:{MQTT_PORT}")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect

    while True:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            break
        except ConnectionRefusedError:
            print("[MQTT] Broker not ready, retrying in 3s...")
            time.sleep(3)

    client.loop_start()

    ser = None
    while ser is None:
        try:
            ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
            print(f"[SERIAL] Port opened")
        except serial.SerialException as e:
            print(f"[SERIAL] Cannot open {SERIAL_PORT}: {e}, retrying in 3s...")
            time.sleep(3)

    time.sleep(2)

    print("[BRIDGE] Listening for DHT11 data...")
    while True:
        try:
            raw = ser.readline()
            if not raw:
                continue
            line = raw.decode("utf-8", errors="ignore").strip()
            if not line:
                continue
            print(f"[SERIAL] {line}")

            data = parse_line(line)
            if data:
                payload = json.dumps(data)
                client.publish(MQTT_TOPIC_STATE, payload)
                print(f"[MQTT] Published: {payload}")
        except serial.SerialException:
            print("[SERIAL] Connection lost, reconnecting...")
            ser.close()
            time.sleep(2)
            try:
                ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
                print("[SERIAL] Reconnected")
            except serial.SerialException:
                print("[SERIAL] Reconnect failed, will retry...")
                time.sleep(3)
        except Exception as e:
            print(f"[ERROR] {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
