import express from "express";
import labDocumentUpload from "../middleware/labDocument.multer.js";
import {
  createMockLabPrescriptions,
  createLabPrescription,
  getLabPrescriptionsByStatus,
  updateLabStatus,
  updateLabPrescription,
  deleteLabPrescription,
  getLabDashboardStats,
  getLabPrescriptionsByPatient,
  generateAIReportForLab
} from "../controllers/labPrescriptionController.js";

const router = express.Router();

// Utility for seeding data to test UI
router.post("/mock", createMockLabPrescriptions);

// Core CRUD
router.post("/", createLabPrescription);
router.post("/by-status", getLabPrescriptionsByStatus);
router.put("/:id/status", updateLabStatus);
router.put("/:id", labDocumentUpload, updateLabPrescription);
router.post("/:id/generate-ai-report", generateAIReportForLab);
router.delete("/:id", deleteLabPrescription);

// Analytics
router.get("/stats", getLabDashboardStats);

// Patient Specific
router.get("/by-patient/:id", getLabPrescriptionsByPatient);

export default router;
