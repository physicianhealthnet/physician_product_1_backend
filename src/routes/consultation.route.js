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


router.post("/clinical-notes", async (req, res) => {
  try {
    const { roomName, appointmentId, summary, chiefComplaint, treatmentPlan } = req.body;
    
    if (!roomName && !appointmentId) {
      return res.status(400).json({ success: false, message: "roomName or appointmentId is required" });
    }

    let actualAppointmentId = appointmentId;

    if (!actualAppointmentId && roomName) {
      const appointment = await AppointmentsModel.findOne({ meetingId: roomName });
      if (appointment) {
        actualAppointmentId = appointment._id;
      }
    }

    const query = actualAppointmentId ? { appointmentId: actualAppointmentId } : { roomName };

    let clinicalNote = await ClinicalNote.findOne(query);

    if (clinicalNote) {
      clinicalNote.summary = summary !== undefined ? summary : clinicalNote.summary;
      clinicalNote.chiefComplaint = chiefComplaint !== undefined ? chiefComplaint : clinicalNote.chiefComplaint;
      clinicalNote.treatmentPlan = treatmentPlan !== undefined ? treatmentPlan : clinicalNote.treatmentPlan;
      if (actualAppointmentId) clinicalNote.appointmentId = actualAppointmentId;
      if (roomName) clinicalNote.roomName = roomName;
      await clinicalNote.save();
    } else {
      clinicalNote = await ClinicalNote.create({
        appointmentId: actualAppointmentId,
        roomName,
        summary,
        chiefComplaint,
        treatmentPlan,
      });
    }

    res.json({ success: true, message: "Clinical note saved successfully", data: clinicalNote });
  } catch (error) {
    console.error("Error saving clinical note:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
