# Arduino Uno + DHT11 firmware

`dht11_monitor.ino` is a self-contained sketch — it does **not** use the
Adafruit DHT library or any other external library.

## Wiring

| DHT11 pin | Arduino Uno pin |
|-----------|-----------------|
| VCC       | 3.3V            |
| GND       | GND             |
| DATA      | D13             |

The sketch enables the Uno's internal pull-up on D13. Many 3-pin DHT11
breakout modules already include a 10 kΩ pull-up; a bare 4-pin sensor needs
one between DATA and VCC.

> If readings are unreliable at 3.3 V, power the DHT11 from 5 V (the data line
> is still read by D13). The DHT11 is specified for 3.3–5.5 V but is happier
> at 5 V.

## Serial protocol

- 9600 baud, 8N1
- One line every 2 seconds
- Success: `temperature=24.0,humidity=56.0`
- Failure: `SENSOR_ERROR`

The Python bridge in `../bridge/serial_to_mqtt.py` parses the first format.

## Build / upload

Arduino IDE:

1. Open `dht11_monitor.ino`.
2. Select **Tools → Board → Arduino Uno** and the correct port.
3. Upload.

`arduino-cli`:

```bash
arduino-cli compile --fqbn arduino:avr:uno .
arduino-cli upload  --fqbn arduino:avr:uno -p /dev/ttyACM0 .
```

## Important: current board firmware does not match this sketch

As of 2026-11-05 the Uno is running different firmware that prints:

```
Read error: Error 253 Reading from DHT11 timed out.
```

`dht11_monitor.ino` never prints that string, so the board has an older
library-based sketch. If you want the behaviour documented here, reflash the
board with this sketch and watch the serial output for
`DHT11_MONITOR_READY`.

If the sensor still times out after reflashing, the fault is the DHT11 module
or its wiring (the port and Arduino were verified working).
