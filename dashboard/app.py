import json
import time
import threading
from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO
import paho.mqtt.client as mqtt

app = Flask(__name__)
app.config["SECRET_KEY"] = "dht11-not-boring"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

MQTT_BROKER = "mosquitto"
MQTT_PORT = 1883
MQTT_TOPIC = "home/dht11/data"

latest = {"temperature": None, "humidity": None, "timestamp": None}
history = []
MAX_HISTORY = 720


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("[MQTT] Connected to broker")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"[MQTT] Connection failed: {rc}")


def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        now = time.time()
        latest["temperature"] = data.get("temperature")
        latest["humidity"] = data.get("humidity")
        latest["timestamp"] = now

        entry = {
            "temperature": data.get("temperature"),
            "humidity": data.get("humidity"),
            "timestamp": now,
        }
        history.append(entry)
        if len(history) > MAX_HISTORY:
            history.pop(0)

        socketio.emit("sensor_update", entry)
    except Exception as e:
        print(f"[MQTT] Parse error: {e}")


def mqtt_thread():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message

    while True:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.loop_forever()
            break
        except ConnectionRefusedError:
            print("[MQTT] Broker not ready, retrying in 3s...")
            time.sleep(3)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/current")
def api_current():
    return jsonify(latest)


@app.route("/api/history")
def api_history():
    return jsonify(history[-MAX_HISTORY:])


if __name__ == "__main__":
    t = threading.Thread(target=mqtt_thread, daemon=True)
    t.start()
    socketio.run(app, host="0.0.0.0", port=5860, debug=False, allow_unsafe_werkzeug=True)
