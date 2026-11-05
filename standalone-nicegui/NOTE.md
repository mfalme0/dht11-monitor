# Legacy standalone app (reference only)

This is the original single-file NiceGUI application (`app.py`, ~725 lines).
It runs on port 8080, lists serial ports, connects to the Arduino directly,
publishes to MQTT itself, and serves its own UI. It is not used by the Docker
Compose stack.

The `README.md` in this folder is the original project README. Some of it is
out of date relative to the current deployment:

- It says to install the Adafruit Unified Sensor / DHT libraries. The sketch
  in `../arduino/` is self-contained and needs no external libraries.
- The app expects `temperature=24,humidity=56` on the serial port; the
  Docker bridge accepts that plus the `Temperature: 24 °C` format.
