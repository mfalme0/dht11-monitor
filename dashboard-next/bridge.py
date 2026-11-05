"""TempWatch MQTT Bridge — streams sensor data via REST + SSE."""
import json
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import paho.mqtt.client as mqtt

MQTT_BROKER = "mosquitto"
MQTT_PORT = 1883
MQTT_TOPIC = "home/dht11/data"
BRIDGE_PORT = 5000
MAX_HISTORY = 720

latest = {"temperature": None, "humidity": None, "timestamp": None}
history: list[dict] = []
alerts: list[dict] = []
sse_clients: list[object] = []
lock = threading.Lock()

prev_temp = None
ALERT_COOLDOWN = 30


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print("[MQTT] Connected to broker", flush=True)
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"[MQTT] Connection failed: {rc}", flush=True)


def on_message(client, userdata, msg):
    global prev_temp
    try:
        data = json.loads(msg.payload.decode())
        now = time.time()
        temp = data.get("temperature")
        hum = data.get("humidity")

        with lock:
            latest["temperature"] = temp
            latest["humidity"] = hum
            latest["timestamp"] = now
            entry = {"temperature": temp, "humidity": hum, "timestamp": now}
            history.append(entry)
            if len(history) > MAX_HISTORY:
                history.pop(0)

            if temp is not None and prev_temp is not None:
                if temp >= 85 and prev_temp < 85:
                    alerts.append({
                        "timestamp": now,
                        "sensor": "DHT11",
                        "message": f"Temperature crossed 85\u00b0C threshold ({temp}\u00b0C)",
                        "level": "hot",
                    })
                elif temp < 85 and prev_temp >= 85:
                    alerts.append({
                        "timestamp": now,
                        "sensor": "DHT11",
                        "message": f"Temperature returned to nominal ({temp}\u00b0C)",
                        "level": "safe",
                    })
                if len(alerts) > 50:
                    alerts.pop(0)
            prev_temp = temp

            notify_sse(entry)

    except Exception as e:
        print(f"[MQTT] Parse error: {e}", flush=True)


def notify_sse(data):
    payload = json.dumps(data)
    dead = []
    for q in sse_clients:
        try:
            q.put(payload)
        except Exception:
            dead.append(q)
    for q in dead:
        try:
            sse_clients.remove(q)
        except ValueError:
            pass


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
            print("[MQTT] Broker not ready, retrying in 3s...", flush=True)
            time.sleep(3)


class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/current":
            with lock:
                data = dict(latest)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())

        elif path == "/api/history":
            with lock:
                data = history[-MAX_HISTORY:]
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())

        elif path == "/api/alerts":
            with lock:
                data = alerts[-50:]
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())

        elif path == "/api/stream":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self._cors()
            self.end_headers()

            import queue
            q = queue.Queue()
            sse_clients.append(q)
            try:
                self.wfile.write(b"data: {\"connected\": true}\n\n")
                self.wfile.flush()
                while True:
                    try:
                        msg = q.get(timeout=30)
                        self.wfile.write(f"data: {msg}\n\n".encode())
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": keepalive\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                try:
                    sse_clients.remove(q)
                except ValueError:
                    pass

        else:
            self.send_response(404)
            self.end_headers()


def main():
    print(f"[BRIDGE] Starting on port {BRIDGE_PORT}", flush=True)
    t = threading.Thread(target=mqtt_thread, daemon=True)
    t.start()
    server = HTTPServer(("0.0.0.0", BRIDGE_PORT), BridgeHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
