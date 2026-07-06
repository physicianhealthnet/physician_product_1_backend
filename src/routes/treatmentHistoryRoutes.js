import express from "express";
import {
  createHistoryController,
  getAllMinimalPatientHistoryData,
  getTargetedPatientTargetRegData,
} from "../controllers/treatmentHistoryController.js";

const treatmentHistoryRouter = express.Router();

treatmentHistoryRouter.post("/add", createHistoryController);
treatmentHistoryRouter.get(
  "/get-all/:patient_id",
  getAllMinimalPatientHistoryData
);
treatmentHistoryRouter.get(
  "/get-targeted/:id",
  getTargetedPatientTargetRegData
);

export default treatmentHistoryRouter;
