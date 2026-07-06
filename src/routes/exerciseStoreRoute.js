import express from "express";
import {
  createExerciseStore,
  getCatogery,
  getExercise,
} from "../controllers/exerciseStoreController.js";
import exerciseUpload from "../middleware/exercise.multer.js";
const exerciseStoreRouter = express.Router();

exerciseStoreRouter.post("/add", exerciseUpload, createExerciseStore);
exerciseStoreRouter.get("/get-category", getCatogery);
exerciseStoreRouter.get("/get-video/:exercise_cat", getExercise);

export default exerciseStoreRouter;
