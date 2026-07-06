import express from "express";
import {
  addSessionNotesController,
  deleteSessionNotesController,
  getAllSessionNotesController,
  getSessionNotesByPatientIdController,
  updateSessionNotesController,
} from "../controllers/sessionNotesController.js";

const sessionNotesRouter = express.Router();

sessionNotesRouter.post("/add", addSessionNotesController);

sessionNotesRouter.get("/get-all/:clinicId", getAllSessionNotesController);

sessionNotesRouter.get(
  "/get-patient/:patientId",
  getSessionNotesByPatientIdController
);

sessionNotesRouter.patch("/update/:id", updateSessionNotesController);

sessionNotesRouter.delete("/delete/:id", deleteSessionNotesController);

export default sessionNotesRouter;
