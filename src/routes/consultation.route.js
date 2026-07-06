import express from "express";
import AppointmentsModel from "../models/Appointments.model.js";
import MeetingRecord from "../models/MeetingRecord.model.js";
import MeetingTranscript from "../models/MeetingTranscript.model.js";
import ClinicalNote from "../models/ClinicalNote.model.js";

const router = express.Router();

router.get("/appointments/:appointmentId/consultation-details", async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await AppointmentsModel.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const [recording, transcript, clinicalNotes] = await Promise.all([
      MeetingRecord.findOne({ appointmentId }),
      MeetingTranscript.findOne({ appointmentId }),
      ClinicalNote.findOne({ appointmentId }),
    ]);

    res.json({
      success: true,
      data: {
        appointment,
        recording: recording || null,
        transcript: transcript || null,
        clinicalNotes: clinicalNotes || null,
      },
    });
  } catch (error) {
    console.error("Error fetching consultation details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
