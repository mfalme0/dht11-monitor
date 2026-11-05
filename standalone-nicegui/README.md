# DHT11 Environment Monitor

A Not Boring-style dashboard for Arduino DHT11 temperature and humidity data, with MQTT publishing for Home Assistant integration.

## Wiring

| DHT11 Pin | Arduino Pin |
|-----------|-------------|
| VCC       | 3.3V        |
| GND       | GND         |
| DATA      | D13         |

## Arduino Setup

1. Install the **Adafruit Unified Sensor** and **DHT sensor library** in the Arduino IDE
2. Open `dht11_monitor.ino` and upload to your Arduino Uno
3. The sketch sends readings every 2 seconds at 9600 baud in the format:
   ```
   temperature=24.0,humidity=56.0
   ```

## Python Setup

```powershell
pip install -r requirements.txt
```

## Run

```powershell
python app.py
```

Open `http://127.0.0.1:8080`, select the serial port, and click **Connect**.

Use the **Demo** toggle to preview the dashboard without hardware.

## Home Assistant (MQTT)

The app publishes sensor data to MQTT with Home Assistant auto-discovery. Sensors appear automatically in HA.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MQTT_HOST` | `localhost` | MQTT broker address |
| `MQTT_PORT` | `1883` | MQTT broker port |
| `MQTT_USER` | _(empty)_ | MQTT username |
| `MQTT_PASS` | _(empty)_ | MQTT password |
| `MQTT_TOPIC_PREFIX` | `home/dht11` | Base topic for readings |
| `MQTT_DISCOVERY_PREFIX` | `homeassistant` | HA discovery prefix |
| `SERIAL_BAUD` | `9600` | Serial baud rate |

### Example

```powershell
$env:MQTT_HOST="192.168.1.100"
$env:MQTT_USER="mqtt_user"
$env:MQTT_PASS="secret"
python app.py
```

### Topics published

- `home/dht11/temperature` — current temperature (°C, retained)
- `home/dht11/humidity` — current humidity (%, retained)
- `home/dht11/state` — JSON `{"temperature": 24.0, "humidity": 56.0}` (retained)
- `homeassistant/sensor/dht11_temperature/config` — HA discovery config
- `homeassistant/sensor/dht11_humidity/config` — HA discovery config
