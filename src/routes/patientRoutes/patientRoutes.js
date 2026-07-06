import express from "express";
import {
  createPatientController,
  deletePatientController,
  editPatientController,
  getAllPatientsByClinicController,
  getAllPatientsController,
  getByPatientId,
  getPatientByIdAndPhone,
  patientLogout,
  generateOverallAIReport,
  analyzeDocumentController,
} from "../../controllers/patientController/patientController.js";
import patientProfileUpload from "../../middleware/patientProfile.multer.js";
import patientDocumentUpload from "../../middleware/patientDocument.multer.js";

const patientRouter = express.Router();

patientRouter.post("/create", patientProfileUpload, createPatientController);

patientRouter.get("/get-all", getAllPatientsController);

patientRouter.get(
  "/get-all-by-clinic/:clinicId",
  getAllPatientsByClinicController
);

patientRouter.get("/get-by-id/:patientId", getByPatientId);

patientRouter.get("/ai-report/:patientId", generateOverallAIReport);

patientRouter.get("/analyze-document/:patientId", analyzeDocumentController);

patientRouter.put("/edit/:id", patientProfileUpload, editPatientController); // Assuming you want to use the same controller for editing

patientRouter.delete("/delete/:id", deletePatientController); // Assuming you have a delete controller

patientRouter.post("/getPatient", getPatientByIdAndPhone);
patientRouter.patch("/logout", patientLogout);

export default patientRouter;
