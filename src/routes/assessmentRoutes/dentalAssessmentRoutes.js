import express from "express";
import {
  createDentalAssessment,
  updateDentalAssessment,
  getDentalAssessmentsByPatientId,
} from "../../controllers/assessmentController/dentalAssessmentController.js";

const dentalAssessmentRouter = express.Router();

dentalAssessmentRouter.post("/create", createDentalAssessment);
dentalAssessmentRouter.patch("/update/:id", updateDentalAssessment);
dentalAssessmentRouter.get("/get-by-patient/:patientId", getDentalAssessmentsByPatientId);

export default dentalAssessmentRouter;
