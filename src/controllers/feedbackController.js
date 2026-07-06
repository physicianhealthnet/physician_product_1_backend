import Feedback from "../models/feedback.model.js";
import { createDBService } from "../services/db.service.js";

const feedbackService = createDBService(Feedback);

export const addFeedBackController = async (req, res) => {
  try {
    const { clinicId, patientId } = req.body;

    // Validate required fields
    if (!clinicId || !patientId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if feedback already exists
    const existingFeedback = await feedbackService.getAll({
      clinicId,
      patientId,
      isDeleted: false,
    });

    if (existingFeedback.length > 0) {
      return res.status(400).json({ message: "Feedback already submitted" });
    }

    // Create new feedback directly from req.body
    const newFeedback = await feedbackService.create(req.body);

    return res.status(201).json({
      message: "Feedback submitted successfully",
      data: newFeedback,
    });
  } catch (error) {
    console.error("Error adding feedback:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateFeedBackController = async (req, res) => {
  try {
    const { clinicId, patientId } = req.body;
    const { id } = req.params;

    // Validate required fields
    if (!clinicId || !patientId) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const updatedFeedback = await Feedback.findByIdAndUpdate(
      id,
      req.body,
      { new: true } // return updated doc
    );

    return res.status(201).json({
      message: "Feedback submitted successfully",
      data: updatedFeedback,
    });
  } catch (error) {
    console.error("Error adding feedback:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getFeedbacksController = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const feedbacks = await feedbackService.getAll({
      clinicId,
      isDeleted: false,
    });
    if (!feedbacks) {
      return res.status(200).json({
        message: "Feedback fetched successfully",
      });
    }
    return res.status(200).json({
      message: "Feedback fetched successfully",
      data: feedbacks,
    });
  } catch (error) {
    console.error("Error adding feedback:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getFeedbackController = async (req, res) => {
  try {
    const { patientId } = req.params;
    const feedbacks = await feedbackService.getAll({
      patientId,
      isDeleted: false,
    });
    if (!feedbacks) {
      return res.status(200).json({
        message: "Feedback fetched successfully",
      });
    }
    return res.status(200).json({
      message: "Feedback fetched successfully",
      data: feedbacks[0],
    });
  } catch (error) {
    console.error("Error adding feedback:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllFeedbacksForMasterController = async (req, res) => {
  try {
    const feedbacks = await feedbackService.getAll({ isDeleted: false });
    if (!feedbacks) {
      return res.status(200).json({
        message: "Feedback fetched successfully",
      });
    }
    return res.status(200).json({
      message: "Feedback fetched successfully",
      data: feedbacks,
    });
  } catch (error) {
    console.error("Error adding feedback:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
