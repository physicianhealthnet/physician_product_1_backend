import express from "express";
import {
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getAssessmentById,
  getAllAssessments,
  getAssessmentsByPatientId,
  getAssessmentsByPHNId,
  getAssessmentsByClinicId,
  getAllChiefComplaints,
} from "../../controllers/assessmentController/physicianAssessmentController.js";
const assessmentRouter = express.Router();

assessmentRouter.post("/create", createAssessment);
assessmentRouter.patch("/update/:id", updateAssessment);
assessmentRouter.delete("/delete/:id", deleteAssessment);
assessmentRouter.get("/get/:id", getAssessmentById);
assessmentRouter.get("/get-all", getAllAssessments);
assessmentRouter.get("/get-by-patient/:patientId", getAssessmentsByPatientId);
assessmentRouter.get("/get-by-phn/:phnId", getAssessmentsByPHNId);
assessmentRouter.get("/get-by-clinic/:clinicId", getAssessmentsByClinicId);
assessmentRouter.get("/get-all-conditions", getAllChiefComplaints);

export default assessmentRouter;
