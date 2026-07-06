import { createDBService } from "../services/db.service.js";
import Exercise from "../models/exercise.model.js";

const exerciseService = createDBService(Exercise);

export const addExerciseController = async (req, res) => {

  try {
    const {
      clinicId,
      patientId,
      exercise_cat,
      name_of_exercise,
      reps,
      sets,
      link,
      end_date,
      no_of_days,
    } = req.body;

    // Validation
    if (
      !patientId ||
      !clinicId ||
      !exercise_cat ||
      !name_of_exercise ||
      !sets ||
      !reps
    ) {
      return res.status(400).json({
        message:
          "Clinic Id, Patient Id, Exercise Category, Name of Exercise, Reps, and Sets are required",
      });
    }

    // Only pick the allowed fields for DB
    const payload = {
      clinicId,
      patientId,
      exercise_cat,
      name_of_exercise,
      reps,
      sets,
      link,
      end_date,
      no_of_days,
    };

    const newExercise = await exerciseService.create(payload);

    return res.status(201).json({
      message: "Exercise Added Successfully",
      data: newExercise,
    });
  } catch (error) {
    console.error("Add Exercise Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getExercisesController = async (req, res) => {
  try {
    const { clinicId, patientId } = req.params;
    // Optional filtering
    const filter = { isDeleted: false };
    if (clinicId) filter.clinicId = clinicId;
    if (patientId) filter.patientId = patientId;

    const exercises = await exerciseService.getAll(filter);

    return res.status(200).json({
      message: "Exercises fetched successfully",
      data: exercises,
    });
  } catch (error) {
    console.error("Get Exercises Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const editExerciseController = async (req, res) => {
  try {
    const { id } = req.params; // Exercise _id from URL
    const updateData = req.body; // Fields to update

    const updatedExercise = await exerciseService.update(id, updateData);

    if (!updatedExercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    return res.status(200).json({
      message: "Exercise updated successfully",
      data: updatedExercise,
    });
  } catch (error) {
    console.error("Edit Exercise Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const deleteExerciseController = async (req, res) => {
  try {
    const { id } = req.params; // Exercise _id from URL

    const deletedExercise = await exerciseService.update(id, {
      isDeleted: true,
    });

    if (!deletedExercise) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    return res.status(200).json({
      message: "Exercise deleted successfully",
    });
  } catch (error) {
    console.error("Delete Exercise Error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
