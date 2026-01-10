import express from "express";
import { voicegenieWebhook } from "../controllers/webhook.controller.js";

const router = express.Router();
router.post("/voicegenie", voicegenieWebhook);

export default router;
