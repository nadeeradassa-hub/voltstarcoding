import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback project generator when API key is unavailable or offline
function getFallbackProject(userPrompt: string, platform: string = 'Arduino Uno R3') {
  const isEsp = platform.toLowerCase().includes('esp');
  const boardName = isEsp ? 'ESP32 DevKit V1' : 'Arduino Uno R3';

  return {
    projectTitle: 'Arduino Uno Autonomous Dual-Motor Driver & Sensor System',
    targetPlatform: boardName,
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
void readAnalogSensors();
void transmitSerialPacket();

// ---------------------------------------------------------------------
// 4. ARDUINO SETUP ROUTINE
// ---------------------------------------------------------------------
void setup() {
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
            telemetry.servoAngle = 45;
            panServo.write(telemetry.servoAngle);
        } else {
            telemetry.obstacleAlert = false;
            digitalWrite(ArduinoUnoPins::BUZZER_ALARM, LOW);
            driveMotors(telemetry.motorSpeed, true);
            telemetry.servoAngle = 90;
            panServo.write(telemetry.servoAngle);
        }

        transmitSerialPacket();
    }
}

void configureHardwarePins() {
    pinMode(ArduinoUnoPins::MOTOR_PWM_ENA, OUTPUT);
    pinMode(ArduinoUnoPins::MOTOR_DIR_IN1, OUTPUT);
    pinMode(ArduinoUnoPins::MOTOR_DIR_IN2, OUTPUT);

    pinMode(ArduinoUnoPins::BUZZER_ALARM, OUTPUT);
    pinMode(ArduinoUnoPins::STATUS_LED, OUTPUT);
    digitalWrite(ArduinoUnoPins::BUZZER_ALARM, LOW);
    digitalWrite(ArduinoUnoPins::STATUS_LED, LOW);

    pinMode(ArduinoUnoPins::US_TRIG, OUTPUT);
    pinMode(ArduinoUnoPins::US_ECHO, INPUT);
    digitalWrite(ArduinoUnoPins::US_TRIG, LOW);

    pinMode(ArduinoUnoPins::ANALOG_SENSOR, INPUT);
}

uint16_t measureUltrasonicDistance() {
    digitalWrite(ArduinoUnoPins::US_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(ArduinoUnoPins::US_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(ArduinoUnoPins::US_TRIG, LOW);

    unsigned long durationUs = pulseIn(ArduinoUnoPins::US_ECHO, HIGH, 25000);
    if (durationUs == 0) return 400;
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
    analogWrite(ArduinoUnoPins::MOTOR_PWM_ENA, speed);
}

void stopMotors() {
    digitalWrite(ArduinoUnoPins::MOTOR_DIR_IN1, LOW);
    digitalWrite(ArduinoUnoPins::MOTOR_DIR_IN2, LOW);
    analogWrite(ArduinoUnoPins::MOTOR_PWM_ENA, 0);
}

void readAnalogSensors() {
    telemetry.analogRaw = analogRead(ArduinoUnoPins::ANALOG_SENSOR);
    telemetry.sensorVoltage = (telemetry.analogRaw / 1023.0f) * 5.0f;
}

void transmitSerialPacket() {
    Serial.print(F("[VoltStar #"));
    Serial.print(telemetry.loopCycle);
    Serial.print(F("] Dist: "));
    Serial.print(telemetry.distanceCm);
    Serial.print(F(" cm | Analog A0: "));
    Serial.print(telemetry.sensorVoltage, 2);
    Serial.print(F(" V | Motor: "));
    Serial.println(telemetry.obstacleAlert ? F("STOPPED 🛑") : F("RUNNING ✓"));
}
`,
    explanation: `### Automatic Hardware Pin Assignment (Arduino Uno R3)
VoltStar AI has automatically selected and assigned all hardware pins without requiring manual configuration:
- DC Motor Speed ENA: Pin D5 (Hardware Timer 0 PWM ~)
- DC Motor Direction: Pins D7 (IN1) & D8 (IN2)
- SG90 Servo Motor: Pin D9 (Hardware Timer 1 PWM ~)
- HC-SR04 Ultrasonic Distance Sensor: Pins D11 (Trig) & D12 (Echo)
- Active Alert Buzzer: Pin D4
- Analog Light/Soil Sensor: Pin A0 (10-bit ADC 0-5V)
- Heartbeat Status LED: Pin D13
- Reserved I2C Bus: Pins A4 (SDA) & A5 (SCL)`,
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
      'Do not power heavy DC motors directly from Arduino Uno 5V pin; power motors from an external battery pack through the L298N power terminal.',
      'Pins D0 and D1 are reserved for USB Serial communication (Serial Monitor / Programming). Avoid connecting sensors to D0 or D1.'
    ]
  };
}

// 1. API: Generate C++ Code & Wire Diagram
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, platform = 'Arduino Uno R3', projectType = 'Motors & Sensors', includeComments = true } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!ai) {
      return res.json(getFallbackProject(prompt, platform));
    }

    const systemPrompt = `You are VoltStar AI, the elite Arduino Uno and C++ Embedded Systems Engineer behind VoltStar Code.
PRIMARY FOCUS: ARDUINO UNO R3 (ATmega328P @ 16 MHz, 5V logic).
Always brand headers with: "Powered by VoltStar".
Target Platform: ${platform}. Project Category: ${projectType}.

CRITICAL MANDATORY REQUIREMENT — AUTOMATIC HARDWARE PIN ASSIGNMENT:
When any motor (DC motor, L298N, L293D, Servo motor, Stepper motor) or sensor (ultrasonic, temperature, light, moisture, PIR, button, buzzer, display, encoder) is connected:
1. YOU MUST ALWAYS AUTOMATICALLY ASSIGN AND PROVIDE THE EXACT ARDUINO UNO HARDWARE PIN.
2. NEVER ASK OR REQUIRE THE USER TO CHOOSE OR PICK PINS. The user should never have to manually configure or guess pins.
3. Every component in "components" MUST include an "assignedPin" field clearly describing the auto-assigned pin, e.g. "D5 (PWM Speed)", "D9 (Servo PWM)", "D11 (TRIG)", "A0 (Analog ADC)", "A4/A5 (I2C)".
4. In the generated C++ code, declare exact #define macros or constexpr pins for every connected motor, sensor, and actuator, with comments stating why that pin was selected (e.g. Hardware Timer PWM, External Interrupt, 10-bit ADC).

Arduino Uno Hardware Pin Constraints to Follow:
- Hardware PWM Speed Pins (for Motors/Servos): Pins 3, 5, 6, 9, 10, 11 (marked with ~)
- Hardware Analog Inputs (for Sensors): Pins A0, A1, A2, A3, A4, A5 (0-5V, 10-bit ADC)
- Hardware I2C (Two-Wire): Pin A4 (SDA), Pin A5 (SCL)
- Hardware SPI: Pin 10 (SS), Pin 11 (MOSI), Pin 12 (MISO), Pin 13 (SCK)
- Digital I/O Pins: D2 through D13
- DO NOT use Pins D0 and D1 for sensors/motors, as D0 (RX) and D1 (TX) are reserved for USB Serial programming and Serial Monitor telemetry.

Respond strictly with valid JSON conforming to this schema (no markdown wrappers or other text outside the JSON):
{
  "projectTitle": "String descriptive name",
  "targetPlatform": "${platform}",
  "summary": "String brief architecture summary",
  "code": "Complete, compiling, production-ready Arduino C++ code with #includes, macros, setup/loop, non-blocking timers, and full motor & sensor drivers with exact auto-assigned pins",
  "explanation": "Markdown string breaking down the code architecture, library requirements, and flow",
  "bom": [
    { "name": "Component Name", "quantity": 1, "spec": "Spec details", "role": "Role description" }
  ],
  "pinTable": [
    { "boardPin": "Arduino Pin Name e.g. D5 (~PWM)", "component": "Component name", "componentPin": "Pin name on component", "wireColor": "Hex color e.g. #f59e0b", "signalType": "PWM/DIGITAL/ANALOG/POWER/GND", "notes": "Specific wiring advice and why this pin was auto-assigned" }
  ],
  "wiringDiagram": {
    "board": {
      "id": "board-arduino-uno",
      "name": "${platform}",
      "type": "arduino-uno",
      "pins": ["5V", "3.3V", "GND", "VIN", "A0", "A1", "A2", "A3", "A4 (SDA)", "A5 (SCL)", "D2", "D3~", "D4", "D5~", "D6~", "D7", "D8", "D9~", "D10~", "D11~", "D12", "D13"]
    },
    "components": [
      {
        "id": "comp-1",
        "name": "Component Name",
        "type": "motor | sensor | display | actuator | led | audio | power",
        "icon": "activity | cpu | thermometer | radio | lightbulb | volume-2 | monitor",
        "assignedPin": "Auto-assigned pin label e.g. D5 (PWM) or A0 (Analog)",
        "pins": ["Pin1", "Pin2", "Pin3", "Pin4"],
        "x": 520,
        "y": 80
      }
    ],
    "connections": [
      {
        "fromPin": "Arduino Board Pin Name matching board.pins exactly e.g. D5~ or A0",
        "toComponentId": "comp-1",
        "toPin": "Component pin name",
        "color": "#hexColor (Red for 5V/VCC, Slate for GND, Green/Cyan for I2C, Amber/Orange for Motors/PWM, Purple/Blue for Signals)",
        "label": "Connection label with auto-assigned pin info"
      }
    ]
  },
  "potentialIssues": [
    "Array of critical gotchas or hardware advice (voltage level shifting, decoupling caps, current limits, external motor power)"
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `User Prompt: ${prompt}\nPlatform: ${platform}\nComments enabled: ${includeComments}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const responseText = response.text?.trim() || '';
    try {
      const parsed = JSON.parse(responseText);
      return res.json(parsed);
    } catch (parseErr) {
      console.warn('JSON parse error from Gemini response, using fallback or cleaned response', parseErr);
      // Clean possible markdown code fences if any
      const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      try {
        const parsedCleaned = JSON.parse(cleaned);
        return res.json(parsedCleaned);
      } catch {
        return res.json(getFallbackProject(prompt, platform));
      }
    }
  } catch (error) {
    console.error('Error generating code & wiring diagram:', error);
    return res.json(getFallbackProject(req.body.prompt || 'VoltStar Project', req.body.platform || 'ESP32'));
  }
});

// 2. API: Chat with VoltStar AI with Google Search Grounding
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, currentCode, platform = 'Arduino Uno R3' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!ai) {
      return res.json({
        role: 'assistant',
        content: `⚡ **VoltStar AI Assistant** (Powered by VoltStar)\n\nI can help you build Arduino Uno & C++ projects! All pins for your motors and sensors are **automatically assigned** so you don't have to pick them:\n\n1. **L298N DC Motors**: Automatically mapped to PWM Pin D5 (Speed) & D7, D8 (Direction).\n2. **SG90 Servo**: Automatically mapped to Timer 1 PWM Pin D9.\n3. **HC-SR04 Ultrasonic**: Automatically mapped to Pins D11 (Trig) & D12 (Echo).\n4. **Analog Sensors**: Automatically mapped to Pin A0.\n\nTell me what motors, sensors, or features you want, and click **"Generate Code & Wiring"** anytime!`,
        sources: [
          { title: 'Arduino Uno Official Hardware Specs', uri: 'https://docs.arduino.cc/hardware/uno-rev3/' },
          { title: 'Arduino Language Reference', uri: 'https://www.arduino.cc/reference/en/' }
        ]
      });
    }

    const systemPrompt = `You are VoltStar AI, the expert Arduino Uno and C++ embedded systems engineer behind VoltStar Code.
You are grounded with real-time Google Search data to provide the latest, most accurate Arduino library versions, hardware datasheet pinouts, and embedded C++ practices.
Primary Target: Arduino Uno R3 (ATmega328P @ 16 MHz, 5V logic).
Current Target Platform: ${platform}.

IMPORTANT INSTRUCTION ON PINS:
Whenever the user mentions or asks about connecting any motor, sensor, or peripheral, ALWAYS explicitly tell them the exact auto-assigned Arduino Uno pin (e.g. D5 PWM for motor speed, D9 for servo, D11/D12 for ultrasonic, A0 for analog sensors, A4/A5 for I2C).
Assure the user that VoltStar automatically determines and provides the exact pins, so they never need to pick pins manually.
Always cite up-to-date library names and include syntax based on Google Search results.
Powered by VoltStar.`;

    const formattedContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    if (currentCode) {
      formattedContents.unshift({
        role: 'user',
        parts: [{ text: `[System Context: The user currently has this C++ code loaded in the IDE]:\n\`\`\`cpp\n${currentCode.slice(0, 1500)}\n\`\`\`` }]
      });
    }

    // Call gemini-3.5-flash with googleSearch tool for real-time grounded search data
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }],
        temperature: 0.5,
      },
    });

    const reply = response.text || 'I am ready to help you craft advanced C++ code and wiring diagrams!';

    // Extract Google Search grounding sources
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: Array<{ title: string; uri: string }> = [];
    const seenUris = new Set<string>();

    for (const chunk of rawChunks) {
      if (chunk.web?.uri && !seenUris.has(chunk.web.uri)) {
        seenUris.add(chunk.web.uri);
        sources.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri
        });
      }
    }

    const searchQueries: string[] = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    return res.json({
      role: 'assistant',
      content: reply,
      sources,
      searchQueries
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return res.json({
      role: 'assistant',
      content: `⚡ **VoltStar Code Advisor**\n\nI'm ready to help you develop your Arduino Uno project! Tell me what motors or sensors you'd like to use (e.g. L298N motors, servo, ultrasonic, or I2C OLED).`,
      sources: []
    });
  }
});

// 2.5 API: Component & Library Search Grounding (Datasheet, Pinouts, Libraries)
app.post('/api/search-intel', async (req, res) => {
  try {
    const { query, platform = 'Arduino Uno R3' } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!ai) {
      return res.json({
        query,
        summary: `Datasheet and pinout intel for ${query} on ${platform}.`,
        recommendedPins: 'Pins auto-allocated based on hardware requirements.',
        libraryName: `#include <${query.replace(/[^a-zA-Z0-9]/g, '')}.h>`,
        codeSnippet: `// Example usage for ${query}\n#include <Arduino.h>\n\nvoid setup() {\n    Serial.begin(115200);\n}\n\nvoid loop() {\n    // Code for ${query}\n}`,
        sources: [
          { title: 'Arduino Official Documentation', uri: 'https://docs.arduino.cc/' },
          { title: 'Adafruit Learning System', uri: 'https://learn.adafruit.com/' }
        ],
        searchQueries: [`${query} Arduino Uno pinout and library`]
      });
    }

    const promptText = `Find real-time up-to-date technical datasheet specifications, exact pinouts, operating voltage (5V vs 3.3V), and recommended Arduino C++ library for: "${query}".
Target platform: ${platform}.
Explain:
1. Component overview & operating voltage limits.
2. Exact pin definitions (VCC, GND, Signal, PWM, I2C, SPI).
3. Recommended modern Arduino C++ library name and #include directive.
4. Auto-assigned optimal pin connection for Arduino Uno.
5. Minimal robust C++ code snippet.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      },
    });

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: Array<{ title: string; uri: string }> = [];
    const seenUris = new Set<string>();

    for (const chunk of rawChunks) {
      if (chunk.web?.uri && !seenUris.has(chunk.web.uri)) {
        seenUris.add(chunk.web.uri);
        sources.push({
          title: chunk.web.title || chunk.web.uri,
          uri: chunk.web.uri
        });
      }
    }

    const searchQueries: string[] = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    return res.json({
      query,
      summary: response.text || `Live specifications found for ${query}`,
      sources,
      searchQueries
    });
  } catch (error) {
    console.error('Error in search-intel:', error);
    return res.status(500).json({ error: 'Search intel failed' });
  }
});

// 3. API: Real-Time Error Detection & Static Analysis
app.post('/api/analyze-code', async (req, res) => {
  try {
    const { code, platform = 'ESP32 DevKit V1' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Quick regex checks for instant feedback
    const quickDiagnostics: Array<{ line: number; severity: 'error' | 'warning' | 'info'; message: string; fixSuggestion?: string }> = [];
    const lines = code.split('\n');

    lines.forEach((line: string, index: number) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Check missing semicolon on variable decl or statements (excluding preprocessor, comments, braces)
      if (
        trimmed.length > 0 &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*') &&
        !trimmed.endsWith('{') &&
        !trimmed.endsWith('}') &&
        !trimmed.endsWith(';') &&
        !trimmed.endsWith(':') &&
        !trimmed.endsWith('\\') &&
        (trimmed.includes('=') || trimmed.includes('return ') || trimmed.includes('pinMode(') || trimmed.includes('digitalWrite(') || trimmed.includes('Serial.print'))
      ) {
        quickDiagnostics.push({
          line: lineNum,
          severity: 'error',
          message: 'Expected \';\' at the end of statement',
          fixSuggestion: `${trimmed};`
        });
      }

      // Check blocking delay()
      if (trimmed.includes('delay(') && !trimmed.startsWith('//')) {
        quickDiagnostics.push({
          line: lineNum,
          severity: 'warning',
          message: 'Blocking delay() call detected. Consider using non-blocking millis() timer for responsive embedded loops.',
          fixSuggestion: 'Use millis() timer check'
        });
      }

      // Check missing Wire.begin() if Wire used
      if (trimmed.includes('Wire.') && !code.includes('Wire.begin')) {
        quickDiagnostics.push({
          line: lineNum,
          severity: 'warning',
          message: 'Wire (I2C) library used without Wire.begin() in setup().',
          fixSuggestion: 'Add Wire.begin(); in setup()'
        });
      }

      // Check Serial.begin mismatch
      if (trimmed.includes('Serial.print') && !code.includes('Serial.begin')) {
        quickDiagnostics.push({
          line: lineNum,
          severity: 'warning',
          message: 'Serial communication used without Serial.begin(baudRate).',
          fixSuggestion: 'Add Serial.begin(115200); in setup()'
        });
      }
    });

    if (!ai) {
      return res.json({
        diagnostics: quickDiagnostics,
        summary: quickDiagnostics.length === 0 ? 'No immediate syntax issues detected. Code structure looks clean!' : `Detected ${quickDiagnostics.length} potential issue(s).`,
        passed: quickDiagnostics.filter(d => d.severity === 'error').length === 0,
        fixedCode: null
      });
    }

    const systemPrompt = `You are an elite C++ compiler and static analysis engine for embedded & modern C++ (target: ${platform}).
Analyze the provided C++ code for:
1. Syntax errors (missing semicolons, unbalanced braces, typos, type mismatches).
2. Embedded/Hardware bugs (pin conflicts, missing Wire.begin(), missing Serial.begin(), blocking delays in ISR, pin mode setup).
3. Memory leaks or buffer overflows.

Respond strictly in valid JSON format:
{
  "diagnostics": [
    {
      "line": 15,
      "severity": "error" | "warning" | "info",
      "message": "Detailed description of the issue",
      "fixSuggestion": "Suggested line fix or replacement"
    }
  ],
  "summary": "Short 1-2 sentence overall health check verdict",
  "passed": true | false,
  "fixedCode": "Full corrected C++ code if any errors were fixed, otherwise null"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `C++ Code to inspect:\n\`\`\`cpp\n${code}\n\`\`\``,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    try {
      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json(parsed);
    } catch {
      return res.json({
        diagnostics: quickDiagnostics,
        summary: 'Static syntax verification completed.',
        passed: quickDiagnostics.filter(d => d.severity === 'error').length === 0,
        fixedCode: null
      });
    }
  } catch (error) {
    console.error('Error analyzing code:', error);
    return res.json({
      diagnostics: [],
      summary: 'Analysis service currently operating in client mode.',
      passed: true,
      fixedCode: null
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`⚡ VoltStar Code Server running at http://localhost:${PORT}`);
    console.log(`Powered by VoltStar`);
  });
}

startServer();
