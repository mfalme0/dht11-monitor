/*
 * DHT11 Environment Monitor — no external libraries
 *
 * Reads temperature and humidity from a DHT11 sensor on pin D13 (3.3V)
 * and sends readings over USB serial at 9600 baud.
 *
 * Expected output format:
 *   temperature=24.0,humidity=56.0
 *
 * Wiring:
 *   DHT11 VCC  → Arduino 3.3V
 *   DHT11 GND  → Arduino GND
 *   DHT11 DATA → Arduino D13
 */

#define DHTPIN 13
#define DHTTYPE DHT11

unsigned long lastReadTime = 0;
const unsigned long READ_INTERVAL = 2000;

// Read a single byte from DHT11 (8 bits, MSB first)
byte readByte() {
    byte value = 0;
    for (int i = 0; i < 8; i++) {
        while (digitalRead(DHTPIN) == LOW) {}  // wait for high
        unsigned long highStart = micros();
        while (digitalRead(DHTPIN) == HIGH) {}  // wait for low
        unsigned long highDuration = micros() - highStart;
        if (highDuration > 40) {
            value |= (1 << (7 - i));  // >40μs high = bit 1
        }
    }
    return value;
}

// Read DHT11: returns 1 on success, 0 on failure
// Sets temp and hum to the read values
byte readDHT11(float &temp, float &hum) {
    // Start signal: pull low 18ms, then release
    pinMode(DHTPIN, OUTPUT);
    digitalWrite(DHTPIN, LOW);
    delay(18);
    digitalWrite(DHTPIN, HIGH);
    delayMicroseconds(40);

    // Switch to input and wait for DHT11 response
    pinMode(DHTPIN, INPUT_PULLUP);

    // Expect ~80μs low then ~80μs high from sensor
    unsigned long timeout;

    timeout = micros();
    while (digitalRead(DHTPIN) == LOW) {
        if (micros() - timeout > 100) return 0;
    }
    timeout = micros();
    while (digitalRead(DHTPIN) == HIGH) {
        if (micros() - timeout > 100) return 0;
    }

    // Read 5 bytes: humidity integer, humidity decimal, temp integer, temp decimal, checksum
    byte data[5] = {0, 0, 0, 0, 0};
    for (int i = 0; i < 5; i++) {
        data[i] = readByte();
    }

    // Verify checksum
    byte checksum = data[0] + data[1] + data[2] + data[3];
    if (checksum != data[4]) return 0;

    hum = data[0] + data[1] / 10.0;
    temp = data[2] + data[3] / 10.0;

    // DHT11 sends 0x80 (128) for negative — not typical but handle it
    if (data[2] & 0x80) {
        temp = -((data[2] & 0x7F) + data[3] / 10.0);
    }

    return 1;
}

void setup() {
    Serial.begin(9600);
    while (!Serial) { ; }

    Serial.println("DHT11_MONITOR_READY");
    delay(2000);
}

void loop() {
    unsigned long now = millis();

    if (now - lastReadTime >= READ_INTERVAL) {
        lastReadTime = now;

        float temperature, humidity;

        if (readDHT11(temperature, humidity)) {
            Serial.print("temperature=");
            Serial.print(temperature, 1);
            Serial.print(",humidity=");
            Serial.println(humidity, 1);
        } else {
            Serial.println("SENSOR_ERROR");
        }
    }
}
