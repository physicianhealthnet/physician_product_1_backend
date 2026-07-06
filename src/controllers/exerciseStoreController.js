import ExerciseStore from "../models/exerciseStore.model.js";
import { createDBService } from "../services/db.service.js";

const exerciseStoreService = createDBService(ExerciseStore);

export const createExerciseStore = async (req, res) => {
  try {
    const { fileCatogery, fileName } = req.body;

    if (!fileCatogery || !fileName || !req.file) {
      return res.status(400).json({ message: "Missing required field" });
    }

    const filePath = `${req.protocol}://${req.get(
      "host"
    )}/api/uploads/exercise-img-and-video/${req.file.filename}`;

    const newFile = await ExerciseStore.create({
      fileCatogery,
      fileName,
      filePath,
    });
    res
      .status(201)
      .json({ message: "File uploaded successfully", data: newFile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCatogery = async (req, res) => {
  try {
    const categories = await ExerciseStore.distinct("fileCatogery", {
      isDeleted: false,
    });
    return res.status(200).json({
      message: "Category fetched successfully",
      fileCatogery: categories,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

export const getExercise = async (req, res) => {
  try {
    const exercise_cat = req.params.exercise_cat;
    const names = await ExerciseStore.find({ isDeleted: false });
    const exercise = names.filter((ex) => ex.fileCatogery === exercise_cat);
    return res.status(200).json({
      message: "Exercise fetched sucessfully",

      exercise: exercise,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
