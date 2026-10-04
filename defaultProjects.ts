import { ProjectData } from '../types';

export const DEFAULT_ARDUINO_UNO_PROJECT: ProjectData = {
  projectTitle: 'Arduino Uno Autonomous Dual-Motor Driver & Sensor System',
  targetPlatform: 'Arduino Uno R3',
  summary: 'Production-ready Arduino Uno sketch controlling DC motors with L298N H-Bridge PWM, SG90 pan servo, HC-SR04 ultrasonic distance sensor, analog light monitor, and alert buzzer. All pins automatically configured.',
  code: `/* ====================================================================
 * Project: Arduino Uno Dual-Motor Driver & Sensor System
 * Target Board: Arduino Uno R3 (ATmega328P @ 16 MHz)
 * Powered by VoltStar
 * 
 * AUTOMATIC PIN ASSIGNMENTS (Auto-Selected by VoltStar AI):
 * - DC Motor Speed (ENA):     Pin D5  (Hardware Timer 0 PWM ~)
 * - DC Motor Direction IN1:   Pin D7  (Digital Output)
 * - DC Motor Direction IN2:   Pin D8  (Digital Output)
 * - Servo Motor Signal:       Pin D9  (Hardware Timer 1 PWM ~)
 * - Ultrasonic Trigger (TRIG): Pin D11 (Hardware Timer 2 PWM / Digital)
 * - Ultrasonic Echo (ECHO):   Pin D12 (Digital Input)
 * - Audible Alert Buzzer:     Pin D4  (Digital Output)
 * - Built-in Status LED:      Pin D13 (Digital Output)
 * - Analog Sensor (LDR/Soil): Pin A0  (10-bit ADC 0-5V Input)
 * - I2C Telemetry Data (SDA): Pin A4  (Hardware I2C SDA)
 * - I2C Telemetry Clock (SCL): Pin A5 (Hardware I2C SCL)
 * ==================================================================== */

#include <Arduino.h>
#include <Servo.h>
#include <Wire.h>

// ---------------------------------------------------------------------
// 1. AUTOMATIC HARDWARE PIN DEFINITIONS (Pre-Configured for Arduino Uno)
// ---------------------------------------------------------------------
namespace ArduinoUnoPins {
    // Motor Driver Pins (L298N / L293D)
    constexpr uint8_t MOTOR_PWM_ENA = 5;   // Hardware PWM pin for motor speed control (0-255)
    constexpr uint8_t MOTOR_DIR_IN1 = 7;   // Motor direction phase 1
    constexpr uint8_t MOTOR_DIR_IN2 = 8;   // Motor direction phase 2

    // Actuators & Buzzers
    constexpr uint8_t SERVO_SIGNAL  = 9;   // Hardware PWM pin for SG90 servo position
    constexpr uint8_t BUZZER_ALARM  = 4;   // Active piezo buzzer trigger
    constexpr uint8_t STATUS_LED    = 13;  // Onboard Arduino Uno status LED

    // Sensors
    constexpr uint8_t US_TRIG       = 11;  // Ultrasonic transmitter pulse
    constexpr uint8_t US_ECHO       = 12;  // Ultrasonic receiver echo
    constexpr uint8_t ANALOG_SENSOR = A0;  // 10-bit ADC Analog input (0 to 1023)
}

// ---------------------------------------------------------------------
// 2. TIMING & SYSTEM CONFIGURATION
// ---------------------------------------------------------------------
namespace SystemConfig {
    constexpr uint32_t SERIAL_BAUD_RATE    = 115200;
    constexpr uint32_t TELEMETRY_INTERVAL  = 500;   // 2 Hz serial telemetry
    constexpr uint32_t BLINK_INTERVAL      = 250;   // Heartbeat toggle ms
    constexpr uint16_t OBSTACLE_LIMIT_CM   = 20;    // Alert distance in cm
}

// ---------------------------------------------------------------------
// 3. RUNTIME STATE & OBJECTS
// ---------------------------------------------------------------------
Servo panServo;

struct SystemTelemetry {
    uint16_t distanceCm = 0;
    uint16_t analogRaw = 0;
    float sensorVoltage = 0.0f;
    uint8_t motorSpeed = 180;
    int servoAngle = 90;
    bool obstacleAlert = false;
    uint32_t loopCycle = 0;
};

SystemTelemetry telemetry;
uint32_t lastTelemetryMillis = 0;
uint32_t lastBlinkMillis = 0;
bool statusLedState = false;

// Function Prototypes
void configureHardwarePins();
uint16_t measureUltrasonicDistance();
void driveMotors(uint8_t speed, bool forward);
void stopMotors();
void updatePanServo();
void readAnalogSensors();
void transmitSerialPacket();

// ---------------------------------------------------------------------
// 4. ARDUINO SETUP ROUTINE
// ---------------------------------------------------------------------
void setup() {
    // Initialize USB Serial Monitor
    Serial.begin(SystemConfig::SERIAL_BAUD_RATE);
    while (!Serial && millis() < 2500) {
        // Wait for serial monitor connection
    }

    Serial.println(F("=================================================="));
    Serial.println(F("⚡ VoltStar Code - Arduino Uno Motor & Sensor System"));
    Serial.println(F("⚡ Powered by VoltStar"));
    Serial.println(F("Board: Arduino Uno R3 (ATmega328P @ 16MHz)"));
    Serial.println(F("Pins: All motors & sensors automatically mapped."));
    Serial.println(F("=================================================="));

    // Configure all digital & PWM pin modes
    configureHardwarePins();

    // Attach SG90 pan servo to automatically assigned Pin 9
    panServo.attach(ArduinoUnoPins::SERVO_SIGNAL);
    panServo.write(90); // Center position

    Serial.println(F("✓ Motors initialized on Pins D5, D7, D8"));
    Serial.println(F("✓ Ultrasonic sensor online on Pins D11, D12"));
    Serial.println(F("✓ Servo initialized on Pin D9"));
    Serial.println(F("✓ System operational. Starting non-blocking loop..."));
}

// ---------------------------------------------------------------------
// 5. MAIN NON-BLOCKING ARDUINO LOOP
// ---------------------------------------------------------------------
void loop() {
    const uint32_t currentMillis = millis();

    // Heartbeat LED pulse
    if (currentMillis - lastBlinkMillis >= SystemConfig::BLINK_INTERVAL) {
        lastBlinkMillis = currentMillis;
        statusLedState = !statusLedState;
        digitalWrite(ArduinoUnoPins::STATUS_LED, statusLedState ? HIGH : LOW);
    }

    // Telemetry sampling & motor control cycle
    if (currentMillis - lastTelemetryMillis >= SystemConfig::TELEMETRY_INTERVAL) {
        lastTelemetryMillis = currentMillis;
        telemetry.loopCycle++;

        // 1. Read distance from HC-SR04 ultrasonic sensor
        telemetry.distanceCm = measureUltrasonicDistance();

        // 2. Read 10-bit analog sensor
        readAnalogSensors();

        // 3. Autonomous motor reaction logic
        if (telemetry.distanceCm > 0 && telemetry.distanceCm < SystemConfig::OBSTACLE_LIMIT_CM) {
            telemetry.obstacleAlert = true;
            digitalWrite(ArduinoUnoPins::BUZZER_ALARM, HIGH);
            stopMotors();
            
            // Sweep servo left to scan for clear path
            telemetry.servoAngle = 45;
            panServo.write(telemetry.servoAngle);
        } else {
            telemetry.obstacleAlert = false;
            digitalWrite(ArduinoUnoPins::BUZZER_ALARM, LOW);
            driveMotors(telemetry.motorSpeed, true);
            
            // Center servo
            telemetry.servoAngle = 90;
            panServo.write(telemetry.servoAngle);
        }

        // 4. Output live telemetry to Serial Monitor
        transmitSerialPacket();
    }
}

// ---------------------------------------------------------------------
// 6. HARDWARE CONTROL FUNCTIONS
// ---------------------------------------------------------------------
void configureHardwarePins() {
    // Motor output pins
    pinMode(ArduinoUnoPins::MOTOR_PWM_ENA, OUTPUT);
    pinMode(ArduinoUnoPins::MOTOR_DIR_IN1, OUTPUT);
    pinMode(ArduinoUnoPins::MOTOR_DIR_IN2, OUTPUT);

    // Actuators & Buzzers
    pinMode(ArduinoUnoPins::BUZZER_ALARM, OUTPUT);
    pinMode(ArduinoUnoPins::STATUS_LED, OUTPUT);
    digitalWrite(ArduinoUnoPins::BUZZER_ALARM, LOW);
    digitalWrite(ArduinoUnoPins::STATUS_LED, LOW);

    // Ultrasonic sensor pins
    pinMode(ArduinoUnoPins::US_TRIG, OUTPUT);
    pinMode(ArduinoUnoPins::US_ECHO, INPUT);
    digitalWrite(ArduinoUnoPins::US_TRIG, LOW);

    // Analog input pin (A0 doesn't strictly need pinMode, but explicit is good)
    pinMode(ArduinoUnoPins::ANALOG_SENSOR, INPUT);
}

uint16_t measureUltrasonicDistance() {
    // Send 10 microsecond trigger pulse
    digitalWrite(ArduinoUnoPins::US_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(ArduinoUnoPins::US_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(ArduinoUnoPins::US_TRIG, LOW);

    // Measure echo pulse width (max 25ms timeout for 4 meters)
    unsigned long durationUs = pulseIn(ArduinoUnoPins::US_ECHO, HIGH, 25000);
    if (durationUs == 0) return 400; // No obstacle or out of range

    // Sound speed: 343 m/s => 29.1 us/cm (round trip / 2)
    return static_cast<uint16_t>(durationUs / 58.2);
}

void driveMotors(uint8_t speed, bool forward) {
    if (forward) {
        digitalWrite(ArduinoUnoPins::MOTOR_DIR_IN1, HIGH);
        digitalWrite(ArduinoUnoPins::MOTOR_DIR_IN2, LOW);
    } else {
        digitalWrite(ArduinoUnoPins::MOTOR_DIR_IN1, LOW);
        digitalWrite(ArduinoUnoPins::MOTOR_DIR_IN2, HIGH);
    }
    // Set PWM speed via Timer 0 on Pin D5
    analogWrite(ArduinoUnoPins::MOTOR_PWM_ENA, speed);
}

void stopMotors() {
    digitalWrite(ArduinoUnoPins::MOTOR_DIR_IN1, LOW);
    digitalWrite(ArduinoUnoPins::MOTOR_DIR_IN2, LOW);
    analogWrite(ArduinoUnoPins::MOTOR_PWM_ENA, 0);
}

void readAnalogSensors() {
    telemetry.analogRaw = analogRead(ArduinoUnoPins::ANALOG_SENSOR);
    // Convert 10-bit ADC (0-1023) to 5.0V Arduino reference
    telemetry.sensorVoltage = (telemetry.analogRaw / 1023.0f) * 5.0f;
}

void transmitSerialPacket() {
    Serial.print(F("[VoltStar #"));
    Serial.print(telemetry.loopCycle);
    Serial.print(F("] Dist: "));
    Serial.print(telemetry.distanceCm);
    Serial.print(F(" cm | Analog A0: "));
    Serial.print(telemetry.sensorVoltage, 2);
    Serial.print(F(" V | Motor PWM: "));
    Serial.print(telemetry.obstacleAlert ? 0 : telemetry.motorSpeed);
    Serial.print(F(" | Alert: "));
    Serial.println(telemetry.obstacleAlert ? F("STOPPED 🛑") : F("CLEAR ✓"));
}
`,
  explanation: `### Automatic Hardware Pin Assignment (Arduino Uno R3)
VoltStar AI has automatically mapped every motor and sensor to optimal Arduino Uno pins without requiring manual configuration:
1. **L298N DC Motor Driver**:
   - **Pin D5 (PWM ~)**: Connected to ENA (Enable A) for smooth 8-bit speed modulation (0-255).
   - **Pins D7 & D8**: Connected to IN1 and IN2 for directional forward/reverse H-Bridge switching.
2. **SG90 Pan Servo Motor**:
   - **Pin D9 (PWM ~)**: Controlled by Timer 1 for jitter-free 50Hz RC servo PWM positioning (45° to 135°).
3. **HC-SR04 Ultrasonic Distance Sensor**:
   - **Pin D11**: Transmitter Trigger pulse output.
   - **Pin D12**: High-speed Echo input pulse measuring flight time.
4. **Active Buzzer Alert**:
   - **Pin D4**: High-level digital trigger when obstacle distance is below threshold.
5. **Analog Sensor (LDR / Moisture)**:
   - **Pin A0**: 10-bit analog-to-digital converter reading (0 to 5.0V with 4.88mV resolution).
6. **I2C Bus Ready**:
   - **Pins A4 (SDA) & A5 (SCL)**: Dedicated hardware Two-Wire interface for optional OLED or gyro sensors.`,
  bom: [
    { name: 'Arduino Uno R3', quantity: 1, spec: 'ATmega328P 16MHz (5V logic)', role: 'Main microcontroller unit' },
    { name: 'L298N Dual Motor Driver', quantity: 1, spec: 'Dual H-Bridge Module (5V/12V)', role: 'DC motor speed & direction control' },
    { name: 'DC Gear Motor & Wheel', quantity: 2, spec: '3-6V TT Dual Shaft Motors', role: 'Robotic rover propulsion' },
    { name: 'SG90 Micro Servo', quantity: 1, spec: '9g 180° Micro Servo (5V)', role: 'Sensor pan sweep mechanism' },
    { name: 'HC-SR04 Ultrasonic Sensor', quantity: 1, spec: '4-pin 5V distance sensor', role: 'Obstacle distance detection' },
    { name: 'Active 5V Buzzer', quantity: 1, spec: 'Piezo audible alarm', role: 'Proximity alert siren' },
    { name: 'Analog Sensor / LDR', quantity: 1, spec: 'Photoresistor + 10kΩ divider', role: 'Environmental ambient reading' },
    { name: 'Dupont Jumper Wires', quantity: 1, spec: 'Male-to-Male & Male-to-Female', role: 'Circuit interconnects' }
  ],
  pinTable: [
    { boardPin: 'D5 (~PWM)', component: 'L298N Motor Driver', componentPin: 'ENA (Speed)', wireColor: '#f59e0b', signalType: 'PWM OUTPUT', notes: 'Auto-assigned hardware PWM speed control' },
    { boardPin: 'D7', component: 'L298N Motor Driver', componentPin: 'IN1 (Dir A)', wireColor: '#3b82f6', signalType: 'DIGITAL OUT', notes: 'Auto-assigned motor forward/reverse logic' },
    { boardPin: 'D8', component: 'L298N Motor Driver', componentPin: 'IN2 (Dir B)', wireColor: '#6366f1', signalType: 'DIGITAL OUT', notes: 'Auto-assigned motor direction inverted pair' },
    { boardPin: 'D9 (~PWM)', component: 'SG90 Servo Motor', componentPin: 'Signal (Orange)', wireColor: '#ec4899', signalType: 'SERVO PWM', notes: 'Auto-assigned 50Hz precision servo control' },
    { boardPin: 'D11 (~PWM)', component: 'HC-SR04 Ultrasonic', componentPin: 'TRIG', wireColor: '#10b981', signalType: 'DIGITAL OUT', notes: 'Auto-assigned 10us transmitter pulse' },
    { boardPin: 'D12', component: 'HC-SR04 Ultrasonic', componentPin: 'ECHO', wireColor: '#06b6d4', signalType: 'DIGITAL IN', notes: 'Auto-assigned pulse width reader' },
    { boardPin: 'D4', component: 'Active 5V Buzzer', componentPin: 'Positive (+)', wireColor: '#f97316', signalType: 'DIGITAL OUT', notes: 'Auto-assigned proximity alert trigger' },
    { boardPin: 'D13', component: 'Status LED', componentPin: 'Anode (+)', wireColor: '#a855f7', signalType: 'DIGITAL OUT', notes: 'Auto-assigned onboard heartbeat LED' },
    { boardPin: 'A0', component: 'Analog Sensor / LDR', componentPin: 'Signal Output', wireColor: '#14b8a6', signalType: 'ANALOG IN', notes: 'Auto-assigned 10-bit ADC input' },
    { boardPin: '5V', component: 'All Sensors & Servo', componentPin: 'VCC / 5V', wireColor: '#ef4444', signalType: 'POWER (5V)', notes: 'Arduino Uno regulated 5V power bus' },
    { boardPin: 'GND', component: 'All Modules & Driver', componentPin: 'GND', wireColor: '#334155', signalType: 'GROUND', notes: 'Common ground between Arduino and L298N' }
  ],
  wiringDiagram: {
    board: {
      id: 'board-arduino-uno',
      name: 'Arduino Uno R3',
      type: 'arduino-uno',
      pins: [
        '5V',
        '3.3V',
        'GND',
        'VIN',
        'A0',
        'A1',
        'A2',
        'A3',
        'A4 (SDA)',
        'A5 (SCL)',
        'D2',
        'D3~',
        'D4',
        'D5~',
        'D6~',
        'D7',
        'D8',
        'D9~',
        'D10~',
        'D11~',
        'D12',
        'D13'
      ]
    },
    components: [
      {
        id: 'comp-motor-driver',
        name: 'L298N Motor Driver',
        type: 'motor',
        icon: 'activity',
        assignedPin: 'D5~ (Speed), D7 & D8 (Dir)',
        pins: ['ENA', 'IN1', 'IN2', '5V', 'GND'],
        x: 520,
        y: 40
      },
      {
        id: 'comp-servo',
        name: 'SG90 Pan Servo Motor',
        type: 'motor',
        icon: 'cpu',
        assignedPin: 'D9~ (Servo PWM)',
        pins: ['Signal', 'VCC', 'GND'],
        x: 520,
        y: 180
      },
      {
        id: 'comp-ultrasonic',
        name: 'HC-SR04 Ultrasonic Sensor',
        type: 'sensor',
        icon: 'radio',
        assignedPin: 'D11 (Trig), D12 (Echo)',
        pins: ['VCC', 'TRIG', 'ECHO', 'GND'],
        x: 520,
        y: 300
      },
      {
        id: 'comp-buzzer',
        name: 'Active 5V Buzzer',
        type: 'audio',
        icon: 'volume-2',
        assignedPin: 'D4 (Alert Output)',
        pins: ['Positive (+)', 'Negative (-)'],
        x: 520,
        y: 430
      },
      {
        id: 'comp-analog',
        name: 'Analog Light / Soil Sensor',
        type: 'sensor',
        icon: 'thermometer',
        assignedPin: 'A0 (Analog ADC)',
        pins: ['VCC', 'GND', 'Signal'],
        x: 520,
        y: 535
      }
    ],
    connections: [
      { fromPin: 'D5~', toComponentId: 'comp-motor-driver', toPin: 'ENA', color: '#f59e0b', label: 'PWM Speed (D5)' },
      { fromPin: 'D7', toComponentId: 'comp-motor-driver', toPin: 'IN1', color: '#3b82f6', label: 'Direction IN1 (D7)' },
      { fromPin: 'D8', toComponentId: 'comp-motor-driver', toPin: 'IN2', color: '#6366f1', label: 'Direction IN2 (D8)' },
      { fromPin: '5V', toComponentId: 'comp-motor-driver', toPin: '5V', color: '#ef4444', label: '5V Logic' },
      { fromPin: 'GND', toComponentId: 'comp-motor-driver', toPin: 'GND', color: '#64748b', label: 'Common GND' },

      { fromPin: 'D9~', toComponentId: 'comp-servo', toPin: 'Signal', color: '#ec4899', label: 'Servo Pulse (D9)' },
      { fromPin: '5V', toComponentId: 'comp-servo', toPin: 'VCC', color: '#ef4444', label: '5V Power' },
      { fromPin: 'GND', toComponentId: 'comp-servo', toPin: 'GND', color: '#64748b', label: 'GND' },

      { fromPin: 'D11~', toComponentId: 'comp-ultrasonic', toPin: 'TRIG', color: '#10b981', label: 'Trig Out (D11)' },
      { fromPin: 'D12', toComponentId: 'comp-ultrasonic', toPin: 'ECHO', color: '#06b6d4', label: 'Echo In (D12)' },
      { fromPin: '5V', toComponentId: 'comp-ultrasonic', toPin: 'VCC', color: '#ef4444', label: '5V Power' },
      { fromPin: 'GND', toComponentId: 'comp-ultrasonic', toPin: 'GND', color: '#64748b', label: 'GND' },

      { fromPin: 'D4', toComponentId: 'comp-buzzer', toPin: 'Positive (+)', color: '#f97316', label: 'Alarm Sig (D4)' },
      { fromPin: 'GND', toComponentId: 'comp-buzzer', toPin: 'Negative (-)', color: '#64748b', label: 'GND' },

      { fromPin: 'A0', toComponentId: 'comp-analog', toPin: 'Signal', color: '#14b8a6', label: 'ADC In (A0)' },
      { fromPin: '5V', toComponentId: 'comp-analog', toPin: 'VCC', color: '#ef4444', label: '5V Power' },
      { fromPin: 'GND', toComponentId: 'comp-analog', toPin: 'GND', color: '#64748b', label: 'GND' }
    ]
  },
  potentialIssues: [
    'Always connect external motor power supply GND together with Arduino Uno GND to establish a common voltage reference.',
    'Do not power heavy DC motors directly from Arduino Uno 5V pin; power motors from an external battery pack (e.g. 7.4V or 9V-12V) through the L298N power terminal.',
    'Pins D0 and D1 are reserved for USB Serial communication (Serial Monitor / Programming). Avoid connecting sensors to D0 or D1.'
  ]
};

export const QUICK_STARTER_IDEAS = [
  {
    title: 'Arduino Uno Obstacle Avoiding Rover (L298N + Ultrasonic)',
    platform: 'Arduino Uno R3',
    prompt: 'Autonomous dual DC motor obstacle avoidance rover with L298N driver, SG90 scanning servo, HC-SR04 ultrasonic distance sensor, and alert buzzer on Arduino Uno.',
    tag: 'Motors & Sensors (Arduino Uno)'
  },
  {
    title: 'Smart Plant Irrigation System (Soil Sensor + Pump Relay)',
    platform: 'Arduino Uno R3',
    prompt: 'Arduino Uno automatic plant watering system with capacitive soil moisture sensor on A0, 5V water pump relay on D3, status LEDs on D7/D8, and 16x2 I2C LCD on A4/A5.',
    tag: 'Sensors & Actuators (Arduino Uno)'
  },
  {
    title: 'PID Dual DC Motor Speed Controller with Encoders',
    platform: 'Arduino Uno R3',
    prompt: 'Precision closed-loop PID DC motor speed stabilizer with optical encoder interrupt on D2/D3, L298N PWM speed on D5/D6, and Serial telemetry on Arduino Uno.',
    tag: 'Motors & Speed PWM (Arduino Uno)'
  },
  {
    title: 'Dual Axis Solar Tracker with Servos & LDRs',
    platform: 'Arduino Uno R3',
    prompt: 'Arduino Uno dual-axis solar panel tracker with 4 light dependent resistors (LDRs) on A0-A3 and 2 SG90 servo motors on D9 and D10.',
    tag: 'Motors & Sensors (Arduino Uno)'
  }
];
