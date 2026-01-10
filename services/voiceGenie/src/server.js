import app from "./app.js";
import { env } from "./config/env.js";
import mongoose from "mongoose";


mongoose
  .connect(env.voicegenie.mongoUri)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(5000 , () =>
      console.log(`🚀 Server running on port 5000`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });


app.listen(env.port, () => {
  console.log(`🚀 Agritrace Voice Service running on port ${env.port}`);
});
