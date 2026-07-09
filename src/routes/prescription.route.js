import express from "express";
import {
  createPrescription,
  getPrescriptionsByPatientId,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
  getHistory,
  getPrescriptionsForPharmacy,
  dispensePrescription,
  getPrescriptionsByPHNId,
  updateMedicineStatus,
} from "../controllers/prescription.controller.js";

const prescriptionRoute = express.Router();

prescriptionRoute.post("/create", createPrescription);
prescriptionRoute.get("/patient/:patientId", getPrescriptionsByPatientId);
prescriptionRoute.get("/get-for-pharmacy", getPrescriptionsForPharmacy);
prescriptionRoute.get("/get-by-phn/:PHN_ID", getPrescriptionsByPHNId);
prescriptionRoute.post("/dispense/:id", dispensePrescription);
prescriptionRoute.get("/:id", getPrescriptionById);
prescriptionRoute.put("/update/:id", updatePrescription);
prescriptionRoute.patch("/update-medicine-status", updateMedicineStatus);
prescriptionRoute.delete("/delete/:id", deletePrescription);
prescriptionRoute.get("/history/:id", getHistory);

export default prescriptionRoute;
