"""DHT11 Environment Monitor — Not Boring Style.

Reads temperature and humidity from an Arduino DHT11 over USB serial,
publishes to MQTT for Home Assistant, and serves a tactile, playful dashboard.

Expected input from the sketch:
    temperature=24,humidity=56
"""

from __future__ import annotations

import json
import os
import queue
import random
import re
import threading
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import paho.mqtt.client as mqtt
import serial
from nicegui import ui
from serial.tools import list_ports


# ---------------------------------------------------------------------------
# Config — override with env vars or edit defaults here
# ---------------------------------------------------------------------------

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER", "")
MQTT_PASS = os.getenv("MQTT_PASS", "")
MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "home/dht11")
MQTT_DISCOVERY_PREFIX = os.getenv("MQTT_DISCOVERY_PREFIX", "homeassistant")
SERIAL_BAUD = int(os.getenv("SERIAL_BAUD", "9600"))

READING_PATTERN = re.compile(
    r"^temperature\s*=\s*(-?\d+(?:\.\d+)?)\s*,\s*humidity\s*=\s*(\d+(?:\.\d+)?)\s*$",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Reading:
    timestamp: datetime
    temperature: float
    humidity: float


# ---------------------------------------------------------------------------
# Serial monitor — reads Arduino lines in a background thread
# ---------------------------------------------------------------------------

class SerialMonitor:
    """Owns the serial connection and publishes lines through a thread-safe queue."""

    def __init__(self) -> None:
        self.events: queue.Queue[tuple[str, object]] = queue.Queue()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._connection: Optional[serial.Serial] = None

    @property
    def connected(self) -> bool:
        return self._connection is not None and self._connection.is_open

    def connect(self, port: str, baudrate: int) -> None:
        self.disconnect()
        self._stop_event.clear()
        self._connection = serial.Serial(port, baudrate, timeout=1)
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()
        self.events.put(("status", f"Connected to {port} at {baudrate} baud"))

    def disconnect(self) -> None:
        self._stop_event.set()
        connection, self._connection = self._connection, None
        if connection is not None:
            try:
                connection.close()
            except serial.SerialException:
                pass
        self._thread = None

    def _read_loop(self) -> None:
        while not self._stop_event.is_set() and self._connection is not None:
            try:
                raw_line = self._connection.readline().decode("utf-8", errors="replace").strip()
            except serial.SerialException as error:
                self.events.put(("error", f"Serial connection lost: {error}"))
                self.disconnect()
                break

            if not raw_line:
                continue
            self.events.put(("line", raw_line))
            match = READING_PATTERN.match(raw_line)
            if match:
                self.events.put(("reading", Reading(datetime.now(), float(match[1]), float(match[2]))))


# ---------------------------------------------------------------------------
# MQTT client — publishes readings + HA auto-discovery
# ---------------------------------------------------------------------------

class MQTTBridge:
    """Publishes sensor readings to MQTT with Home Assistant auto-discovery."""

    def __init__(self) -> None:
        self._client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        self._connected = False
        self._status_queue: queue.Queue[str] = queue.Queue()

        if MQTT_USER:
            self._client.username_pw_set(MQTT_USER, MQTT_PASS)

        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def status(self) -> Optional[str]:
        if self._status_queue.empty():
            return None
        return self._status_queue.get_nowait()

    def connect(self) -> None:
        try:
            self._client.connect_async(MQTT_HOST, MQTT_PORT, keepalive=60)
            self._client.loop_start()
        except Exception as error:
            self._status_queue.put(f"MQTT connect failed: {error}")

    def disconnect(self) -> None:
        self._client.loop_stop()
        self._client.disconnect()
        self._connected = False

    def publish(self, reading: Reading) -> None:
        if not self._connected:
            return
        self._client.publish(f"{MQTT_TOPIC_PREFIX}/temperature", f"{reading.temperature:.1f}", retain=True)
        self._client.publish(f"{MQTT_TOPIC_PREFIX}/humidity", f"{reading.humidity:.1f}", retain=True)
        self._client.publish(
            f"{MQTT_TOPIC_PREFIX}/state",
            json.dumps({"temperature": reading.temperature, "humidity": reading.humidity}),
            retain=True,
        )

    def _on_connect(self, client: mqtt.Client, userdata: object, flags: mqtt.ConnectFlags, rc: int, properties: mqtt.Properties | None = None) -> None:
        self._connected = True
        self._status_queue.put("MQTT connected")
        self._publish_discovery()

    def _on_disconnect(self, client: mqtt.Client, userdata: object, flags: mqtt.DisconnectFlags, rc: int, properties: mqtt.Properties | None = None) -> None:
        self._connected = False
        self._status_queue.put("MQTT disconnected")

    def _publish_discovery(self) -> None:
        """Send HA MQTT auto-discovery configs so sensors appear automatically."""
        base = {
            "state_topic": f"{MQTT_TOPIC_PREFIX}/state",
            "device": {
                "identifiers": ["dht11_monitor"],
                "name": "DHT11 Monitor",
                "model": "Arduino Uno + DHT11",
                "manufacturer": "DIY",
            },
        }

        for metric, unit, icon, device_class in [
            ("temperature", "°C", "mdi:thermometer", "temperature"),
            ("humidity", "%", "mdi:water-percent", "humidity"),
        ]:
            config = {
                **base,
                "name": metric.title(),
                "unique_id": f"dht11_{metric}",
                "value_template": f"{{{{ value_json.{metric} }}}}",
                "unit_of_measurement": unit,
                "icon": icon,
                "device_class": device_class,
            }
            client_id = f"homeassistant/sensor/dht11_{metric}/config"
            self._client.publish(client_id, json.dumps(config), retain=True)


# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------

monitor = SerialMonitor()
mqtt_bridge = MQTTBridge()
history: deque[Reading] = deque(maxlen=300)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def ports() -> dict[str, str]:
    return {port.device: f"{port.device} — {port.description}" for port in list_ports.comports()}


def temp_to_color(temp: float) -> str:
    """Map temperature to a CSS color for the background scene."""
    # Clamp to 10-40 range for color mapping
    t = max(10.0, min(40.0, temp))
    # Interpolate: 10°C → cool blue, 25°C → neutral, 40°C → warm amber
    if t <= 25:
        ratio = (t - 10) / 15  # 0 → 1
        r = int(30 + ratio * 20)
        g = int(60 + ratio * 40)
        b = int(120 - ratio * 30)
    else:
        ratio = (t - 25) / 15  # 0 → 1
        r = int(50 + ratio * 130)
        g = int(100 - ratio * 40)
        b = int(90 - ratio * 50)
    return f"rgb({r},{g},{b})"


def temp_to_accent(temp: float) -> str:
    """Accent color for the hero number."""
    t = max(10.0, min(40.0, temp))
    if t <= 20:
        return "#7dd3fc"  # cool sky blue
    if t <= 28:
        return "#fbbf24"  # warm gold
    return "#f87171"  # hot red


def comfort_label(temperature: float, humidity: float) -> tuple[str, str]:
    if 18 <= temperature <= 27 and 35 <= humidity <= 60:
        return "Comfortable", "#4ade80"
    if humidity > 70:
        return "Humid", "#fbbf24"
    if temperature > 30:
        return "Warm", "#f87171"
    if temperature < 16:
        return "Cold", "#7dd3fc"
    return "Check environment", "#a78bfa"


def make_chart_options(readings: deque[Reading]) -> dict:
    points = [r.timestamp.strftime("%H:%M:%S") for r in readings]
    return {
        "animation": True,
        "animationDuration": 800,
        "animationEasing": "cubicOut",
        "grid": {"left": 48, "right": 48, "top": 40, "bottom": 36},
        "tooltip": {
            "trigger": "axis",
            "backgroundColor": "rgba(15,23,42,0.9)",
            "borderColor": "rgba(255,255,255,0.1)",
            "textStyle": {"color": "#e2e8f0"},
        },
        "legend": {
            "data": ["Temperature °C", "Humidity %"],
            "top": 5,
            "textStyle": {"color": "#94a3b8"},
        },
        "xAxis": {
            "type": "category",
            "data": points,
            "boundaryGap": False,
            "axisLine": {"lineStyle": {"color": "#334155"}},
            "axisLabel": {"color": "#64748b"},
        },
        "yAxis": [
            {
                "type": "value",
                "name": "°C",
                "axisLine": {"lineStyle": {"color": "#334155"}},
                "axisLabel": {"color": "#64748b"},
                "splitLine": {"lineStyle": {"color": "#1e293b"}},
            },
            {
                "type": "value",
                "name": "%",
                "min": 0,
                "max": 100,
                "axisLine": {"lineStyle": {"color": "#334155"}},
                "axisLabel": {"color": "#64748b"},
                "splitLine": {"show": False},
            },
        ],
        "series": [
            {
                "name": "Temperature °C",
                "type": "line",
                "smooth": True,
                "symbol": "none",
                "lineStyle": {"width": 3, "color": "#fbbf24"},
                "areaStyle": {
                    "color": {
                        "type": "linear",
                        "x": 0, "y": 0, "x2": 0, "y2": 1,
                        "colorStops": [
                            {"offset": 0, "color": "rgba(251,191,36,0.25)"},
                            {"offset": 1, "color": "rgba(251,191,36,0.02)"},
                        ],
                    }
                },
                "data": [r.temperature for r in readings],
            },
            {
                "name": "Humidity %",
                "type": "line",
                "smooth": True,
                "symbol": "none",
                "yAxisIndex": 1,
                "lineStyle": {"width": 2, "color": "#7dd3fc", "type": "dashed"},
                "data": [r.humidity for r in readings],
            },
        ],
    }


# ---------------------------------------------------------------------------
# Main dashboard
# ---------------------------------------------------------------------------

@ui.page("/")
def dashboard() -> None:
    demo_state = {"temperature": 22.0, "humidity": 50.0}
    scrub_index: dict[str, int] = {"value": -1}  # -1 = live mode

    ui.add_head_html("""<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');

        * { box-sizing: border-box; }

        body {
            margin: 0;
            font-family: 'Inter', system-ui, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            overflow-x: hidden;
            transition: background 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .hero-temp {
            font-size: clamp(6rem, 18vw, 14rem);
            font-weight: 800;
            line-height: 0.85;
            letter-spacing: -0.04em;
            transition: color 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
            text-shadow: 0 0 80px rgba(251, 191, 36, 0.15);
            user-select: none;
            cursor: default;
        }

        .hero-unit {
            font-size: clamp(1.5rem, 4vw, 3rem);
            font-weight: 300;
            color: #64748b;
            margin-left: 0.15em;
            vertical-align: super;
        }

        .metric-pill {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 9999px;
            padding: 0.5rem 1.25rem;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            backdrop-filter: blur(8px);
        }

        .metric-pill:hover {
            background: rgba(255,255,255,0.08);
            border-color: rgba(255,255,255,0.15);
            transform: translateY(-1px);
        }

        .glass-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 1rem;
            backdrop-filter: blur(12px);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .glass-card:hover {
            background: rgba(255,255,255,0.05);
            border-color: rgba(255,255,255,0.1);
        }

        .status-dot {
            width: 8px; height: 8px; border-radius: 50%;
            display: inline-block; margin-right: 6px;
            transition: background 0.3s ease;
        }

        .scrub-track {
            width: 100%; height: 6px; border-radius: 3px;
            background: rgba(255,255,255,0.06);
            cursor: pointer; position: relative;
            overflow: visible;
        }

        .scrub-fill {
            height: 100%; border-radius: 3px;
            background: linear-gradient(90deg, #7dd3fc, #fbbf24);
            transition: width 0.15s ease;
        }

        .scrub-thumb {
            width: 18px; height: 18px; border-radius: 50%;
            background: #fbbf24; border: 3px solid #0f172a;
            position: absolute; top: 50%; transform: translate(-50%, -50%);
            box-shadow: 0 0 16px rgba(251, 191, 36, 0.4);
            transition: left 0.15s ease, box-shadow 0.2s ease;
            cursor: grab;
        }

        .scrub-thumb:hover {
            box-shadow: 0 0 24px rgba(251, 191, 36, 0.6);
        }

        .comfort-badge {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 0.35rem 0.9rem; border-radius: 9999px;
            font-size: 0.75rem; font-weight: 600;
            letter-spacing: 0.04em; text-transform: uppercase;
            transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .humidity-gauge {
            width: 80px; height: 80px; border-radius: 50%;
            position: relative; display: flex; align-items: center;
            justify-content: center; flex-direction: column;
        }

        .humidity-gauge svg {
            position: absolute; top: 0; left: 0;
            width: 100%; height: 100%;
            transform: rotate(-90deg);
        }

        .humidity-gauge circle {
            fill: none; stroke-width: 4;
            cx: 40; cy: 40; r: 36;
        }

        .humidity-gauge .bg { stroke: rgba(255,255,255,0.06); }
        .humidity-gauge .fill {
            stroke: #7dd3fc;
            stroke-dasharray: 226.2;
            stroke-linecap: round;
            transition: stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .serial-log {
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            font-size: 0.75rem;
            color: #64748b;
            background: rgba(0,0,0,0.3);
            border-radius: 0.5rem;
            padding: 0.75rem;
            max-height: 120px;
            overflow-y: auto;
            line-height: 1.6;
        }
    </style>""")

    # --- Page layout ---
    with ui.column().classes("w-full min-h-screen p-6 md:p-10 gap-6").style(
        "max-width: 900px; margin: 0 auto;"
    ):
        # Header row
        with ui.row().classes("w-full items-center justify-between"):
            ui.label("DHT11").classes("text-xl font-semibold tracking-tight")
            with ui.row().classes("items-center gap-2"):
                status_label = ui.html(
                    '<span class="status-dot" style="background:#64748b"></span>Disconnected'
                ).classes("text-sm text-slate-400")

        # Hero temperature
        hero_color = temp_to_accent(22.0)
        temp_display = ui.html(
            f'<div class="hero-temp" style="color:{hero_color}">—<span class="hero-unit">°</span></div>'
        )

        # Secondary metrics row
        with ui.row().classes("w-full gap-3 items-center"):
            comfort_badge = ui.html(
                '<span class="comfort-badge" style="background:rgba(255,255,255,0.04);color:#64748b">'
                "Waiting for data</span>"
            )

            humidity_gauge = ui.html("""<div class="humidity-gauge">
                <svg viewBox="0 0 80 80">
                    <circle class="bg"/>
                    <circle class="fill" style="stroke-dashoffset: 226.2"/>
                </svg>
                <span style="font-size:0.85rem;font-weight:700;color:#7dd3fc;position:relative;z-index:1">—</span>
                <span style="font-size:0.55rem;color:#64748b;position:relative;z-index:1">%</span>
            </div>""")

            last_updated = ui.label("No readings yet").classes("text-xs text-slate-500 ml-auto")

        # Timeline scrub
        with ui.column().classes("w-full gap-2"):
            ui.label("Timeline").classes("text-xs font-semibold text-slate-500 uppercase tracking-widest")
            scrub_container = ui.html("""<div class="scrub-track" id="scrubTrack">
                <div class="scrub-fill" id="scrubFill" style="width:100%"></div>
                <div class="scrub-thumb" id="scrubThumb" style="left:100%"></div>
            </div>""")
            scrub_info = ui.label("Live").classes("text-xs text-slate-500")

        # Chart
        with ui.card().classes("w-full glass-card").style("padding:1rem;"):
            chart = ui.echart(make_chart_options(deque(maxlen=300))).classes("w-full h-64")

        # Connection controls
        with ui.card().classes("w-full glass-card").style("padding:1rem;"):
            with ui.row().classes("w-full items-end gap-3 flex-wrap"):
                port_select = ui.select(ports(), label="Serial port").classes("min-w-48 grow")
                baud_select = ui.select([9600, 115200], value=9600, label="Baud").classes("w-28")
                def refresh_ports() -> None:
                    port_select.options = ports()
                    port_select.update()
                    ui.notify("Ports refreshed")

                ui.button("Refresh", icon="refresh", on_click=refresh_ports).props("flat dense")
                ui.button("Connect", icon="link", on_click=lambda: _connect()).classes()
                ui.button("Disconnect", icon="link_off", on_click=lambda: _disconnect()).props("flat dense")
                demo_toggle = ui.switch("Demo", value=False).props("color=amber")

        # MQTT controls
        with ui.card().classes("w-full glass-card").style("padding:1rem;"):
            with ui.row().classes("w-full items-center gap-3"):
                mqtt_status = ui.label("MQTT: not connected").classes("text-xs text-slate-500")
                ui.button("Connect MQTT", icon="wifi", on_click=lambda: _connect_mqtt()).props("flat dense")
                ui.button("Disconnect MQTT", icon="wifi_off", on_click=lambda: _disconnect_mqtt()).props("flat dense")

        # Serial log (collapsed by default)
        with ui.card().classes("w-full glass-card").style("padding:1rem;"):
            with ui.row().classes("w-full items-center justify-between"):
                ui.label("Serial output").classes("text-sm font-semibold text-slate-400")
                log_toggle = ui.switch("", value=False).props("color=slate")
            serial_log = ui.html('<div class="serial-log" id="serialLog" style="display:none"></div>')

    # --- Actions ---

    def _connect() -> None:
        if not port_select.value:
            ui.notify("Choose a serial port first", type="warning")
            return
        try:
            monitor.connect(port_select.value, int(baud_select.value))
        except (serial.SerialException, ValueError) as error:
            ui.notify(f"Connection failed: {error}", type="negative")

    def _disconnect() -> None:
        monitor.disconnect()
        _update_status("disconnected")

    def _connect_mqtt() -> None:
        mqtt_bridge.connect()

    def _disconnect_mqtt() -> None:
        mqtt_bridge.disconnect()

    def _update_status(state: str) -> None:
        if state == "connected":
            color = "#4ade80"
            text = "Connected"
        elif state == "error":
            color = "#f87171"
            text = "Error"
        else:
            color = "#64748b"
            text = "Disconnected"
        status_label.content = (
            f'<span class="status-dot" style="background:{color}"></span>{text}'
        )
        status_label.update()

    def _update_hero(reading: Reading) -> None:
        bg = temp_to_color(reading.temperature)
        accent = temp_to_accent(reading.temperature)
        ui.run_javascript(f"document.body.style.background = '{bg}'")

        temp_display.content = (
            f'<div class="hero-temp" style="color:{accent}">'
            f"{reading.temperature:.1f}<span class='hero-unit'>°</span></div>"
        )
        temp_display.update()

        # Humidity gauge
        pct = reading.humidity / 100.0
        dashoffset = 226.2 * (1 - pct)
        humidity_gauge.content = f"""<div class="humidity-gauge">
            <svg viewBox="0 0 80 80">
                <circle class="bg"/>
                <circle class="fill" style="stroke-dashoffset: {dashoffset:.1f}"/>
            </svg>
            <span style="font-size:0.85rem;font-weight:700;color:#7dd3fc;position:relative;z-index:1">{reading.humidity:.0f}</span>
            <span style="font-size:0.55rem;color:#64748b;position:relative;z-index:1">%</span>
        </div>"""
        humidity_gauge.update()

        # Comfort badge
        label, color = comfort_label(reading.temperature, reading.humidity)
        comfort_badge.content = (
            f'<span class="comfort-badge" style="background:rgba(255,255,255,0.04);color:{color}">'
            f"{label}</span>"
        )
        comfort_badge.update()

        last_updated.text = f"Updated {reading.timestamp.strftime('%H:%M:%S')}"
        last_updated.update()

    def _update_chart() -> None:
        chart.options = make_chart_options(history)
        chart.update()

    def _push_log(text: str) -> None:
        ui.run_javascript(f"""
            const log = document.getElementById('serialLog');
            if (log) {{
                log.innerHTML += '<div>{text}</div>';
                log.scrollTop = log.scrollHeight;
            }}
        """)

    def _process_events() -> None:
        # MQTT status
        mqtt_msg = mqtt_bridge.status
        if mqtt_msg:
            color = "#4ade80" if "connected" in mqtt_msg and "disconnected" not in mqtt_msg else "#f87171"
            mqtt_status.text = f"MQTT: {mqtt_msg}"
            mqtt_status.update()

        # Demo mode
        if demo_toggle.value:
            demo_state["temperature"] += random.uniform(-0.35, 0.35)
            demo_state["temperature"] = max(5, min(45, demo_state["temperature"]))
            demo_state["humidity"] = max(15, min(95, demo_state["humidity"] + random.uniform(-1.0, 1.0)))
            reading = Reading(datetime.now(), demo_state["temperature"], demo_state["humidity"])
            _push_log(f"temperature={reading.temperature:.1f},humidity={reading.humidity:.1f}")
            _handle_reading(reading)

        # Serial events
        while not monitor.events.empty():
            event, payload = monitor.events.get_nowait()
            if event == "reading":
                _handle_reading(payload)  # type: ignore[arg-type]
            elif event == "line":
                _push_log(str(payload))
            elif event == "status":
                _update_status("connected")
            elif event == "error":
                _update_status("error")
                ui.notify(str(payload), type="negative")

    def _handle_reading(reading: Reading) -> None:
        history.append(reading)
        if scrub_index["value"] == -1:  # only update hero if in live mode
            _update_hero(reading)
        _update_chart()
        mqtt_bridge.publish(reading)

    # Log visibility toggle
    def _toggle_log() -> None:
        ui.run_javascript(f"""
            const log = document.getElementById('serialLog');
            if (log) log.style.display = '{'block' if log_toggle.value else 'none'}';
        """)

    log_toggle.on_value_change(lambda e: _toggle_log())

    # Scrub interaction via JS
    ui.run_javascript("""
        const track = document.getElementById('scrubTrack');
        const thumb = document.getElementById('scrubThumb');
        const fill = document.getElementById('scrubFill');
        let dragging = false;

        function setPos(pct) {
            pct = Math.max(0, Math.min(100, pct));
            thumb.style.left = pct + '%';
            fill.style.width = pct + '%';
        }

        function getPct(e) {
            const rect = track.getBoundingClientRect();
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            return ((x - rect.left) / rect.width) * 100;
        }

        track.addEventListener('mousedown', e => { dragging = true; setPos(getPct(e)); });
        track.addEventListener('touchstart', e => { dragging = true; setPos(getPct(e)); }, {passive: true});
        window.addEventListener('mousemove', e => { if (dragging) setPos(getPct(e)); });
        window.addEventListener('touchmove', e => { if (dragging) setPos(getPct(e)); }, {passive: true});
        window.addEventListener('mouseup', () => { dragging = false; });
        window.addEventListener('touchend', () => { dragging = false; });
    """)

    ui.timer(1.0, _process_events)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ in {"__main__", "__mp_main__"}:
    ui.run(title="DHT11 Monitor", host="0.0.0.0", port=8080)
