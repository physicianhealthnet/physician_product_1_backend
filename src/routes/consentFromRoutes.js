import express from "express";
import {
  createConsentFromController,
  getByPatientIdController,
  updateConsentFromController,
} from "../controllers/consentFromController.js";

const consentFromRoutes = express.Router();

consentFromRoutes.post("/add", createConsentFromController);

consentFromRoutes.get("/get-patient/:patientId", getByPatientIdController);

consentFromRoutes.put("/edit/:id", updateConsentFromController);

export default consentFromRoutes;
