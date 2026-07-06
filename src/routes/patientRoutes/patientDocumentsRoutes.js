import express from "express";
import {
  createPatientDocument,
  deletePatientDocumentController,
  editPatientDocumentController,
  getPatientDocumentsByPatientId,
} from "../../controllers/patientController/patientDocumentsController.js";

import patientDocumentUpload from "../../middleware/patientDocument.multer.js";

const patientDocumentsRouter = express.Router();

patientDocumentsRouter.post(
  "/create",
  patientDocumentUpload,
  createPatientDocument
);
patientDocumentsRouter.get(
  "/get-by-patient-id/:patientId",
  getPatientDocumentsByPatientId
);
patientDocumentsRouter.put(
  "/edit/:id",
  patientDocumentUpload,
  editPatientDocumentController
);
patientDocumentsRouter.delete("/delete/:id", deletePatientDocumentController);

export default patientDocumentsRouter;
