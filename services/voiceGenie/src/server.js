import app from "./app.js";
import { env } from "./config/env.js";
import mongoose from "mongoose";

// SECURITY FIX: Only start server once, after MongoDB connection is established
mongoose
  .connect(env.voicegenie.mongoUri)
  .then(() => {
    console.log("✅ MongoDB connected");
    
    // FIXED: Start server ONLY inside the MongoDB connection success block
    // Removed duplicate app.listen() at bottom of file
    app.listen(env.port || 5000, () => {
      console.log(`🚀 Agritrace Voice Service running on port ${env.port || 5000}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit if database connection fails
  });

// REMOVED: Duplicate app.listen() call that was causing EADDRINUSE error
