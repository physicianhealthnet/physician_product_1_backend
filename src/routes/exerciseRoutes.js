import express from "express";
import {
  addExerciseController,
  getExercisesController,
  editExerciseController,
  deleteExerciseController,
} from "../controllers/exerciseController.js";

const exerciseRouter = express.Router();

exerciseRouter.post("/add", addExerciseController);

exerciseRouter.get("/get/:clinicId/:patientId", getExercisesController);

exerciseRouter.patch("/edit/:id", editExerciseController);

exerciseRouter.delete("/delete/:id", deleteExerciseController);

export default exerciseRouter;
