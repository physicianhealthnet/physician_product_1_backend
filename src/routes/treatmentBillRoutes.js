import express from "express";
import {
  addTreatmentBillController,
  deleteTreatmentBillController,
  getAllTreatmentBillController,
  getTreatmentBillController,
  updateTreatmentBillController,
  getAllClinicTreatmentBillController,
  getTreatmentBillControllerByPhnId,
} from "../controllers/treatmentBillController.js";

const treatmentBillRouter = express.Router();

treatmentBillRouter.post("/add", addTreatmentBillController);

treatmentBillRouter.get("/get-all/:clinicId", getAllTreatmentBillController);

treatmentBillRouter.get("/get-all", getAllClinicTreatmentBillController);

treatmentBillRouter.get("/get-patient/:patientId", getTreatmentBillController);
treatmentBillRouter.get("/get-patient-phnid/:patientPHNId", getTreatmentBillControllerByPhnId);

treatmentBillRouter.patch("/update/:id", updateTreatmentBillController);

treatmentBillRouter.delete("/delete/:id", deleteTreatmentBillController);

export default treatmentBillRouter;
