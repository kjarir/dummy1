// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// // Fix __dirname for ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Path to JSON dump file
// const DATA_DIR = path.join(__dirname, "../../data");
// const FILE_PATH = path.join(DATA_DIR, "voicegenie-calls.json");

// export async function voicegenieWebhook(req, res) {
//   try {
//     const payload = req.body;

//     console.log("📞 VoiceGenie Webhook Received");

//     // Ensure data directory exists
//     if (!fs.existsSync(DATA_DIR)) {
//       fs.mkdirSync(DATA_DIR, { recursive: true });
//     }

//     // Load existing data (or initialize empty array)
//     let existingData = [];
//     if (fs.existsSync(FILE_PATH)) {
//       const fileContent = fs.readFileSync(FILE_PATH, "utf-8");
//       existingData = fileContent ? JSON.parse(fileContent) : [];
//     }

//     // Normalize & store only what you need
//     const callRecord = {
//       campaignId: payload.campaignId,
//       callId: payload.callId,
//       phone: payload.customerNumber,
//       status: payload.status,
//       language: payload.language,
//       duration: payload.duration,
//       answers: payload.answers || payload.responses || {},
//       rawPayload: payload, // keep full raw payload for debugging
//       receivedAt: new Date().toISOString(),
//     };

//     // Append new record
//     existingData.push(callRecord);

//     // Write back to file (pretty formatted)
//     fs.writeFileSync(
//       FILE_PATH,
//       JSON.stringify(existingData, null, 2),
//       "utf-8"
//     );

//     console.log("✅ Call data saved to voicegenie-calls.json");

//     res.status(200).json({ ok: true });
//   } catch (error) {
//     console.error("❌ Webhook save failed:", error);
//     res.status(500).json({ ok: false, error: "Failed to save webhook data" });
//   }
// }


import Call from "../models/Call.model.js";

export async function voicegenieWebhook(req, res) {
  try {
    const payload = req.body;

    console.log("📞 VoiceGenie Webhook Received");

    const raw = payload.rawPayload || payload;

    const callDoc = {
      campaignId: raw.campaignId,
      phoneNumber: raw.customerSpecificData?.PhoneNumber || "",
      status: raw.callStatus || "unknown",
      duration: Number(raw.duration || 0),
      transcript: raw.transcript || [],
      answers: raw.answersToQuestion || {},
      informationGathered: raw.informationGathered || {},
      callSummary: raw.callSummary || "",
      rawPayload: raw,
      receivedAt: new Date(),
    };

    await Call.create(callDoc);

    console.log("✅ Call data saved to MongoDB");

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("❌ VoiceGenie webhook error:", error);
    return res.status(500).json({ ok: false });
  }
}
