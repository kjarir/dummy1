import "./config/env.js";   
import express from "express";
import cors from "cors";
import mandiRoutes from "./routes/mandi.routes.js";



const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/mandi", mandiRoutes);

app.get("/", (_, res) => {
  res.send("Mandi Price API running");
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
