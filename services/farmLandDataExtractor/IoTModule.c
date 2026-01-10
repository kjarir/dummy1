//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 
// ESP32 Agriculture Monitoring + ThingSpeak
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHTesp.h>

// ---------------- WiFi ----------------
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// ---------------- ThingSpeak ----------------
String apiKey = "WVW7SRHXIYQJPXSG";   // YOUR API KEY
const char* server = "https://hardwareapi-4xbs.onrender.com/update";

// ---------------- Pins ----------------
#define DHTPIN 15
#define SOIL_MOISTURE_PIN 34
#define LDR_PIN 35
#define MQ2_PIN 32
#define RAIN_SENSOR_PIN 33   // Potentiometer

// ---------------- Thresholds ----------------
int MOISTURE_THRESHOLD_LOW = 15;
int MOISTURE_THRESHOLD_HIGH = 85;

DHTesp dht;

void setup() {
  Serial.begin(115200);
  Serial.println();

  dht.setup(DHTPIN, DHTesp::DHT22);

  // WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.println("System Started");
}

void loop() {
  delay(15000); // ThingSpeak minimum delay

  Serial.println("-------------");

  // -------- Soil Moisture --------
  int soilRaw = analogRead(SOIL_MOISTURE_PIN);
  int soilMoisturePercentage = map(soilRaw, 4095, 0, 0, 100);
  Serial.print("Soil Moisture: ");
  Serial.print(soilMoisturePercentage);
  Serial.println(" %");

  // -------- LDR --------
  int ldrValue = analogRead(LDR_PIN);
  Serial.print("LDR Value: ");
  Serial.println(ldrValue);

  // -------- MQ2 Gas --------
  int mq2Value = analogRead(MQ2_PIN);
  Serial.print("MQ-2 Gas Value: ");
  Serial.println(mq2Value);

  // -------- Rain Sensor (Potentiometer) --------
  int rainRaw = analogRead(RAIN_SENSOR_PIN);
  int rainPercent = map(rainRaw, 4095, 0, 0, 70);
  Serial.print("Rain Intensity: ");
  Serial.print(rainPercent);
  Serial.println(" %");

  // -------- DHT22 --------
  float h = dht.getHumidity();
  float t = dht.getTemperature();

  if (isnan(h) || isnan(t)) {
    Serial.println("DHT read failed");
    return;
  }

  Serial.print("Humidity: ");
  Serial.print(h);
  Serial.print(" % | Temperature: ");
  Serial.print(t);
  Serial.println(" °C");

  // -------- Send to ThingSpeak --------
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    String url = String(server) + "?api_key=" + apiKey +
                 "&field1=" + String(t) +
                 "&field2=" + String(h) +
                 "&field3=" + String(soilMoisturePercentage) +
                 "&field4=" + String(ldrValue) +
                 "&field5=" + String(mq2Value) +
                 "&field6=" + String(rainPercent);

    http.begin(url);
    int httpResponseCode = http.GET();

    if (httpResponseCode > 0) {
      Serial.println("Data sent to ThingSpeak");
    } else {
      Serial.println("Error sending data");
    }

    http.end();
  }

  Serial.println("-------------");
}