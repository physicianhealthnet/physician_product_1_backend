import express from "express";
import {
  createSpecialistAssessment,
  updateSpecialistAssessment,
  deleteSpecialistAssessment,
  getSpecialistAssessmentById,
  getSpecialistAssessmentsByPatientId,
  getSpecialistAssessmentsByPatientAndDept,
  getAllSpecialistAssessments,
} from "../../controllers/assessmentController/specialistAssessmentController.js";

const specialistAssessmentRouter = express.Router();

specialistAssessmentRouter.post("/create", createSpecialistAssessment);
specialistAssessmentRouter.patch("/update/:id", updateSpecialistAssessment);
specialistAssessmentRouter.delete("/delete/:id", deleteSpecialistAssessment);
specialistAssessmentRouter.get("/get/:id", getSpecialistAssessmentById);
specialistAssessmentRouter.get("/patient/:patientId", getSpecialistAssessmentsByPatientId);
specialistAssessmentRouter.get(
  "/patient/:patientId/dept/:department",
  getSpecialistAssessmentsByPatientAndDept
);
specialistAssessmentRouter.get("/get-all", getAllSpecialistAssessments);

export default specialistAssessmentRouter;
