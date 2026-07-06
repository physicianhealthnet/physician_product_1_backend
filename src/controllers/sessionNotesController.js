import { createDBService } from "../services/db.service.js";
import SessionNotes from "../models/Sessionnotes.model.js";

const sessionNotesService = createDBService(SessionNotes);

export const addSessionNotesController = async (req, res) => {
  try {
    const { clinicId, patientId, sessionNotes, sessionDate } = req.body;
    if (!clinicId || !patientId || !sessionNotes || !sessionDate) {
      return res.status(400).json({
        message:
          "Clinic ID, Patient ID, Session Notes, and Session Date are required",
      });
    }
    const existingSessionNotes = await sessionNotesService.getOne({
      clinicId,
      patientId,
      sessionDate,
      isDeleted: false,
    });
    if (existingSessionNotes) {
      return res.status(400).json({
        message: "Session notes already exist for this patient on this date",
      });
    }
    const newSessionNotes = await sessionNotesService.create({
      ...req.body,
      treatment_status: "live",
    });
    return res.status(201).json({
      message: "Session notes added successfully",
      data: newSessionNotes,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
export const getSessionNotesByPatientIdController = async (req, res) => {
  try {
    const { patientId } = req.params;
    const sessionNotes = await sessionNotesService.getAll({
      patientId,
      treatment_status: "live",
      isDeleted: false,
    });
    return res.status(200).json({
      message: "Session notes retrieved successfully",
      data: sessionNotes,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
export const getAllSessionNotesController = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const sessionNotes = await sessionNotesService.getAll({
      clinicId,
      isDeleted: false,
    });
    return res.status(200).json({
      message: "All session notes retrieved successfully",
      data: sessionNotes,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const updateSessionNotesController = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionNotes = await sessionNotesService.update(id, req.body);
    return res.status(200).json({
      message: "Session notes updated successfully",
      data: sessionNotes,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
export const deleteSessionNotesController = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionNotes = await sessionNotesService.update(id, {
      isDeleted: true,
    });
    return res.status(200).json({
      message: "Session notes deleted successfully",
      data: sessionNotes,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
