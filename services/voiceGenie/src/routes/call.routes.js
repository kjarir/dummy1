import express from "express";
import { callFarmer, getAllCalls } from "../controllers/call.controller.js";

const router = express.Router();

router.get("/", getAllCalls);

router.post("/call", callFarmer);

export default router;
