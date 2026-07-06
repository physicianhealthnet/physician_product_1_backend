import express from "express";
import {
  createPatientRegistrationController,
  editPatientRegistRationController,
  getAllRegistrationsForTaqrgetedPatientController,
  getByPatientIdController,
  syncPatientRegistrationController,
} from "../../controllers/patientController/patientRegistrationController.js";

const patientRegistrationRouter = express.Router();

patientRegistrationRouter.post("/create", createPatientRegistrationController);
patientRegistrationRouter.get(
  "/get-by-patient/:patientId",
  getByPatientIdController
);
patientRegistrationRouter.get(
  "/get-all-registrations/:patientId",
  getAllRegistrationsForTaqrgetedPatientController
);
patientRegistrationRouter.patch("/edit/:id", editPatientRegistRationController);
patientRegistrationRouter.post("/sync", syncPatientRegistrationController);

export default patientRegistrationRouter;
