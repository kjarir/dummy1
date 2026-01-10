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

// PERFORMANCE FIX: Add index on createdAt for sorting queries
// The controller sorts by createdAt: -1, so we need an index
CallSchema.index({ createdAt: -1 });

// Additional indexes for common queries
CallSchema.index({ phoneNumber: 1, createdAt: -1 });
CallSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Call", CallSchema);
