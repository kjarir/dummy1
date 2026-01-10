import express from "express";
import cors from "cors";
import callRoutes from "./routes/call.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/calls", callRoutes);
app.use("/webhook", webhookRoutes);

export default app;
