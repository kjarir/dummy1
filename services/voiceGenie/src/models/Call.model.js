import mongoose from "mongoose";

const TranscriptSchema = new mongoose.Schema(
  {
    sender: {
      type: String, // BOT | HUMAN
      enum: ["BOT", "HUMAN"],
    },
    message: String,
    timestamp: String,
  },
  { _id: false }
);

const CallSchema = new mongoose.Schema(
  {
    campaignId: {
      type: String,
      index: true,
    },

    phoneNumber: {
      type: String,
      index: true,
    },

    status: {
      type: String, // Ended | No Answer | etc.
    },

    duration: {
      type: Number,
      default: 0,
    },

    transcript: {
      type: [TranscriptSchema],
      default: [],
    },

    answers: {
      type: Object,
      default: {},
    },

    informationGathered: {
      type: Object,
      default: {},
    },

    callSummary: {
      type: String,
      default: "",
    },

    rawPayload: {
      type: Object,
      required: true,
    },

    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Call", CallSchema);
