// controllers/treatmentTrackerController.js
import TreatmentTracker from "../models/treatmentTracker.model.js";
import AppointmentsModel from "../models/Appointments.model.js";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";

const addTreatmentTracker = async (req, res) => {
  try {
    const { patientId, ...trackerData } = req.body;
    const newTracker = new TreatmentTracker({
      patientId,
      treatment_status: "live",
      ...trackerData,
    });
    const savedTracker = await newTracker.save();
    // Auto-generate appointmentId (e.g. APPT-20250915-001)
    const today = dayjs().format("YYYYMMDD");
    const lastAppointment = await AppointmentsModel.findOne({
      date: trackerData.nextReview,
    }).sort({
      createdAt: -1,
    });

    let nextNumber = 1;
    if (lastAppointment && lastAppointment.appointmentId) {
      const lastNum = parseInt(lastAppointment.appointmentId.split("-").pop());
      if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    const appointmentId = `APPT-${today}-${String(nextNumber).padStart(
      3,
      "0"
    )}`;

    const appointmentUpdate = await AppointmentsModel.create({
      clinicId: trackerData.clinicId,
      patientId: patientId,
      patientName: trackerData.patientName,
      doctor: trackerData.doctor,
      date: trackerData.nextReview,
      startTime: trackerData.startTime,
      appointmentId: appointmentId,
    });
    res.status(201).json({ savedTracker, appointmentUpdate });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateTreatmentTracker = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedTracker = await TreatmentTracker.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    );

    // Auto-generate appointmentId (e.g. APPT-20250915-001)
    const today = dayjs().format("YYYYMMDD");

    /* ================= GET LATEST SESSION ================= */
    let latestSession = null;

    if (
      updatedData?.upcomming_sessions &&
      updatedData.upcomming_sessions.length > 0
    ) {
      // Sort and pick last added session
      latestSession = updatedData.upcomming_sessions.reduce((a, b) =>
        a.sessionNo > b.sessionNo ? a : b
      );
    } else {
      // Only session 1 exists
      latestSession = {
        sessionNo: 1,
        date: updatedData.nextReview,
        startTime: updatedData.startTime,
        doctor: updatedData.doctor,
      };
    }

    /* ================= CHECK DUPLICATE DATE + TIME ================= */
    const existingSameTimeAppointment = await AppointmentsModel.findOne({
      patientId: updatedData.patientId,
      date: latestSession.date,
      startTime: latestSession.startTime,
    });

    if (existingSameTimeAppointment) {
      return res.status(200).json({
        success: false,
        message: "Appointment already exists for this patient at the same time",
        updatedTracker,
      });
    } else {
      /* ================= GENERATE APPOINTMENT ID ================= */

      const lastAppointment = await AppointmentsModel.findOne({
        date: latestSession.date,
      }).sort({ createdAt: -1 });

      let nextNumber = 1;
      if (lastAppointment?.appointmentId) {
        const lastNum = parseInt(
          lastAppointment.appointmentId.split("-").pop()
        );
        if (!isNaN(lastNum)) nextNumber = lastNum + 1;
      }

      const appointmentId = `APPT-${today}-${String(nextNumber).padStart(
        3,
        "0"
      )}`;

      /* ================= CREATE ONLY ONE APPOINTMENT ================= */
      const appointment = await AppointmentsModel.create({
        clinicId: updatedData.clinicId,
        patientId: updatedData.patientId,
        patientName: updatedData.patientName,
        doctor: latestSession.doctor || updatedData.doctor,
        date: latestSession.date,
        startTime: latestSession.startTime,
        sessionNo: latestSession.sessionNo, // 🔑 key
        appointmentId,
      });

      /* ================= RESPONSE ================= */
      res.status(201).json({
        success: true,
        message: "Latest session appointment created",
        updatedTracker,
        appointment,
      });
    }

    if (!updatedTracker) {
      return res.status(404).json({ message: "TreatmentTracker not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAllTreatmentTrackers = async (req, res) => {
  try {
    const trackers = await TreatmentTracker.find({ isDeleted: false });
    res.json(trackers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTreatmentTrackerByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;
    const tracker = await TreatmentTracker.findOne({
      patientId,
      treatment_status: "live",
      isDeleted: false,
    }).populate("patientId");
    if (!tracker) {
      return res
        .status(404)
        .json({ message: "TreatmentTracker not found for this patient" });
    }
    res.json(tracker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTreatmentTrackerById = async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = await TreatmentTracker.findOne({
      _id: id,
      isDeleted: false,
    }).populate("patientId");
    if (!tracker) {
      return res.status(404).json({ message: "TreatmentTracker not found" });
    }
    res.json(tracker);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllTreatmentTrackerHomeAdviseOptions = async (req, res) => {
  try {
    const data = await TreatmentTracker.find({ isDeleted: false });
    const allHomeAdvice = data
      .map((doc) => doc.homeAdvice)
      .filter((val) => val && val.trim() !== "");

    const uniqueHomeAdvice = [...new Set(allHomeAdvice)];

    res.status(200).json({
      message: "Data fetched successfully",
      data: uniqueHomeAdvice,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error,
    });
  }
};

export {
  addTreatmentTracker,
  updateTreatmentTracker,
  getAllTreatmentTrackers,
  getTreatmentTrackerByPatientId,
  getTreatmentTrackerById,
  getAllTreatmentTrackerHomeAdviseOptions,
};
