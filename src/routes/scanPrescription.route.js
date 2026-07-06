import express from "express";
import scanDocumentUpload from "../middleware/scanDocument.multer.js";
import {
  createMockScanPrescriptions,
  createScanPrescription,
  getScanPrescriptionsByStatus,
  updateScanStatus,
  updateScanPrescription,
  deleteScanPrescription,
  getScanDashboardStats,
  getScanPrescriptionsByPatient,
  generateAIReportForScan
} from "../controllers/scanPrescriptionController.js";

const router = express.Router();

// Utility for seeding data to test UI
router.post("/mock", createMockScanPrescriptions);

// Core CRUD
router.post("/", createScanPrescription);
router.post("/by-status", getScanPrescriptionsByStatus);
router.put("/:id/status", updateScanStatus);
router.put("/:id", scanDocumentUpload, updateScanPrescription);
router.post("/:id/generate-ai-report", generateAIReportForScan);
router.delete("/:id", deleteScanPrescription);

// Analytics
router.get("/stats", getScanDashboardStats);

// Patient Specific
router.get("/by-patient/:id", getScanPrescriptionsByPatient);

export default router;
