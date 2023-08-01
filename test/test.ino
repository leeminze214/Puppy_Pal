#include <Adafruit_MotorShield.h>
#define led_pin 5
#define rpi_pin 6
#define MOTOR 4
Adafruit_MotorShield AFMS = Adafruit_MotorShield();
Adafruit_DCMotor *Motor = AFMS.getMotor(MOTOR);

void setup() {
  // put your setup code here, to run once:
  AFMS.begin();
  pinMode(led_pin, OUTPUT);
  pinMode(rpi_pin, INPUT);
  Motor->setSpeed(0);
  Motor->run(RELEASE);
}

void loop() {
  // put your main code here, to run repeatedly:
  Serial.print(digitalRead(rpi_pin));
  if (digitalRead(rpi_pin) == 1) {
    digitalWrite(led_pin, HIGH);
    Motor->run(FORWARD);
    Motor->setSpeed(100);
    delay(1000);
    Motor->run(BACKWARD);
    Motor->setSpeed(100);
    delay(1000);
  } else {
    digitalWrite(led_pin, LOW);
    Motor->run(RELEASE);
    Motor->setSpeed(0);
  }
}