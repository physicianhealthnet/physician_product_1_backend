import express from "express";
import { getChatHistory, getActiveSessions } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/messages/:clinicId/:patientId", getChatHistory);
router.get("/sessions/:clinicId", getActiveSessions);

export default router;

