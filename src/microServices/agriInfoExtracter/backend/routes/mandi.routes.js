import express from "express";
import { getCropPrice } from "../controllers/mandi.controller.js";

const router = express.Router();

router.get("/price", getCropPrice);

export default router;
