# DHT11 Environment Monitor ("uno")

Complete source package for the Arduino Uno + DHT11 temperature/humidity
monitor. Exported 2026-11-05 from:

- `/home/mfalme/uno` — deployed Docker Compose stack
- `/root/uno` — original Arduino sketch and standalone NiceGUI app

## Architecture

```
Arduino Uno + DHT11
        │ USB serial, /dev/ttyACM0 @ 9600 8N1
        ▼
  dht11-bridge (Python/pyserial)
        │ MQTT publish: home/dht11/data  {"temperature":19.0,"humidity":65.0}
        ▼
  mosquitto (MQTT broker, :1883)
        ├── Home Assistant auto-discovery (retained config messages)
        └── dashboard (:5860)
```

Two dashboard implementations are included:

| Directory        | Stack                                  | Status |
|------------------|----------------------------------------|--------|
| `dashboard/`     | Flask + Flask-SocketIO, subscribes MQTT directly | This is what is **currently running** (image `uno-dashboard`) |
| `dashboard-next/`| Next.js 15 + `bridge.py` MQTT→REST/SSE proxy     | Built by the current `docker-compose.yml` |

`dashboard-next/bridge.py` is also usable standalone: it subscribes to MQTT and
exposes `/api/current`, `/api/history`, `/api/alerts`, and `/api/stream` (SSE)
on port 5000.

## Layout

```
dht11-monitor/
├── docker-compose.yml
├── arduino/
│   └── dht11_monitor.ino        # self-contained sketch, no libraries
├── bridge/                      # serial → MQTT
│   ├── serial_to_mqtt.py
│   ├── requirements.txt
│   └── Dockerfile
├── dashboard/                   # Flask + Socket.IO dashboard (running)
│   ├── app.py
│   ├── templates/index.html
│   ├── static/card/             # CasaOS widget assets
│   ├── requirements.txt
│   └── Dockerfile
├── dashboard-next/              # Next.js dashboard + MQTT bridge
│   ├── bridge.py
│   ├── Dockerfile               # Next.js app
│   ├── Dockerfile.bridge        # mqtt-bridge service
│   ├── src/ ...
│   └── package.json
├── mosquitto/mosquitto.conf
└── standalone-nicegui/          # original single-file NiceGUI app
    ├── app.py
    ├── requirements.txt
    └── README.md
```

## Ports

| Port | Service | Notes |
|------|---------|-------|
| 5860 | dashboard | host → container 5860 |
| 1883 | mosquitto | MQTT, anonymous access enabled |
| 5000 | mqtt-bridge | internal only (no host mapping) |

## Running (Docker)

Requirements: Docker + Compose plugin, the Arduino plugged in as
`/dev/ttyACM0`, and the user able to access the `dialout` group.

```bash
cd dht11-monitor
docker compose up -d --build
docker compose ps
docker compose logs -f dht11-bridge
```

The serial device is bind-mounted from the host:

```yaml
devices:
  - /dev/ttyACM0:/dev/ttyACM0
group_add:
  - dialout
```

Dashboard: <http://localhost:5860>

## MQTT topics

| Topic | Payload |
|-------|---------|
| `home/dht11/data` | `{"temperature": 19.0, "humidity": 65.0}` |
| `homeassistant/sensor/dht11_temperature/config` | HA discovery JSON (retained) |
| `homeassistant/sensor/dht11_humidity/config` | HA discovery JSON (retained) |

The bridge also accepts the sketch formats `temperature=21,humidity=50` and
`Temperature: 21 °C\tHumidity: 77 %` (case-insensitive regex).

## Arduino

See `arduino/README.md`. The sketch in this package prints either
`temperature=24.0,humidity=56.0` or `SENSOR_ERROR`.

## Configuration

`docker-compose.yml` sets `MQTT_BROKER_URL=http://mqtt-bridge:5000` for the
Next.js dashboard. `dashboard-next/.env.local` contains
`MQTT_BROKER_URL=http://dht11-bridge:5000`, which is not a real service name
when running under Compose — the Compose environment variable takes
precedence, but keep this in mind when running the app outside Compose.



Originally generated as a "Not Boring"-style dashboard with Home Assistant
MQTT discovery.
