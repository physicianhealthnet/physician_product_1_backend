import express from "express";
import { startRecord, stopRecord, saveTranscript } from "../controllers/jitsiBotController.js";

const router = express.Router();

router.post("/start", startRecord);
router.post("/stop", stopRecord);
router.post("/transcript", saveTranscript);

export default router;
