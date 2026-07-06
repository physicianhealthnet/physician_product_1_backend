// routes/treatmentTrackerRoutes.js
import express from "express";
import {
  addTreatmentTracker,
  updateTreatmentTracker,
  getAllTreatmentTrackers,
  getTreatmentTrackerByPatientId,
  getTreatmentTrackerById,
  getAllTreatmentTrackerHomeAdviseOptions,
} from "../controllers/treatmentTrackerController.js";

const treatmentTrackerRoute = express.Router();

treatmentTrackerRoute.post("/", addTreatmentTracker);
treatmentTrackerRoute.get(
  "/get-home-advise",
  getAllTreatmentTrackerHomeAdviseOptions
);
treatmentTrackerRoute.put("/:id", updateTreatmentTracker);
treatmentTrackerRoute.get("/get-all", getAllTreatmentTrackers);
treatmentTrackerRoute.get(
  "/patient/:patientId",
  getTreatmentTrackerByPatientId
);
treatmentTrackerRoute.get("/:id", getTreatmentTrackerById);

export default treatmentTrackerRoute;
