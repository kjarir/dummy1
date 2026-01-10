import { pushCall } from "../services/voicegenie.service.js";
import { validateE164 } from "../utils/phone.util.js";
import Call from "../models/Call.model.js";


export async function callFarmer(req, res) {
  try {
    const { phone, farmerMeta } = req.body;

    validateE164(phone);

    const result = await pushCall({
      customerNumber: phone,
      customerInformation: {
        role: "farmer",
        platform: "Agritrace",
        ...farmerMeta,
      },
    });

    res.json({ ok: true, result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
}


export async function getAllCalls(req, res) {
  try {
    const calls = await Call.find()
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({
      success: true,
      count: calls.length,
      data: calls,
    });
  } catch (error) {
    console.error("❌ Failed to fetch calls:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch call records",
    });
  }
}