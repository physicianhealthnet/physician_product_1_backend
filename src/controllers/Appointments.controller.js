// controllers/appointment.controller.js

import Patient from "../models/patientModel/patient.model.js";
import AppointmentsModel from "../models/Appointments.model.js";
import mongoose from "mongoose";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
import { createGoogleMeetEvent } from "../services/googleCalendar.service.js";
// 1️⃣ Create / Book Appointment
dayjs.extend(isoWeek);
export const createAppointment = async (req, res) => {
  try {
    let {
      patientName,
      patient,
      patientId,
      aadhaarNumber,
      phoneNumber,
      doctor,
      category,
      date,
      startTime,
      clinicId,
      doctorId,
      webAppointmentId,
    } = req.body;

    // 🛠️ If patient is empty string, set it to undefined
    if (!patient) patient = undefined;

    // Check if this is a web appointment sync and if it already exists locally
    if (webAppointmentId) {
      const existing = await AppointmentsModel.findOne({ webAppointmentId, isDeleted: false });
      if (existing) {
        return res.status(200).json({ 
          success: true, 
          message: "Appointment already synced", 
          appointment: existing 
        });
      }
    }

    // Auto-generate appointmentId (e.g. APPT-20250915-001)
    const today = dayjs().format("YYYYMMDD");
    const lastAppointment = await AppointmentsModel.findOne({ date }).sort({
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

    // ✅ Create appointment
    const newAppointment = await AppointmentsModel.create({
      appointmentId,
      patientName,
      patient, // undefined if new patient
      patientId,
      aadhaarNumber,
      phoneNumber,
      doctor,
      category,
      date,
      startTime,
      clinicId,
      doctorId,
      webAppointmentId,
    });

    // Generate Google Meet Link dynamically
    const meetData = await createGoogleMeetEvent(newAppointment);
    newAppointment.meetLink = meetData.meetLink;
    newAppointment.meetingId = meetData.meetingId;
    await newAppointment.save();

    res.status(201).json({ success: true, appointment: newAppointment });
  } catch (err) {
    console.error("❌ Error creating appointment:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const getAppointments = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      date,
      category,
      status,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // Build query object dynamically
    const query = {};

    // 🔎 Search filter (patientName, phoneNumber, aadhaarNumber, doctor name)
    if (search) {
      query.$or = [
        { patientName: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { aadhaarNumber: { $regex: search, $options: "i" } },
        { doctor: { $regex: search, $options: "i" } },
      ];
    }

    // 📅 Filter by exact date
    if (date) {
      // Normalize date to remove time differences
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    // 📂 Filter by category
    if (category) {
      query.category = category;
    }

    // 📊 Filter by status
    if (status) {
      query.status = status;
    }

    // 🪵 Debug logs

    // Count total for pagination
    const total = await AppointmentsModel.countDocuments(query);

    // Fetch appointments with pagination
    const appointments = await AppointmentsModel.find(query)
      .sort({ createdAt: -1 }) // latest first
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: appointments,
    });
  } catch (err) {
    console.error("❌ Error fetching appointments:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
// 3️⃣ Update Appointment Status
const STATUS_TIMESTAMPS = {
  "Checked-in": "checkedInAt",
  Engaged: "engagedStartAt",
  Completed: "completedAt",
  "Checked-out": "checkedOutAt",
  Cancelled: "cancelledAt",
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const { status, cancelReason, cancelledBy } = req.body;

    const allowedStatuses = [
      "Booked",
      "Checked-in",
      "Engaged",
      "Completed",
      "Checked-out",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const appointment = await AppointmentsModel.findById(id);
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });

    // Update status
    appointment.status = status;

    // Update timestamp only if not already set (avoid overwriting)
    const timestampField = STATUS_TIMESTAMPS[status];
    if (timestampField && !appointment[timestampField]) {
      appointment[timestampField] = new Date();
    }

    // Handle cancel-specific fields
    if (status === "Cancelled") {
      appointment.cancelReason = cancelReason || "Not provided";
      appointment.cancelledBy = cancelledBy || "Patient";
    }

    await appointment.save();
    res.json({ success: true, appointment });
  } catch (err) {
    console.error("❌ Error updating appointment:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 4️⃣ Get Appointments by Date / Week / Month
// export const getAppointmentsByDate = async (req, res) => {
//   try {
//     const { date } = req.query; // expected: "YYYY-MM-DD"

//     if (!date) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Date is required" });
//     }

//     const appointments = await AppointmentsModel.find({
//       date: { $eq: date },
//     }).sort({ date: 1, startTime: 1 });

//     res.json({ success: true, appointments });
//   } catch (err) {
//     console.error("❌ Error fetching appointments by date:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// export const getAppointmentsByWeek = async (req, res) => {
//   try {
//     const { start, end } = req.query; // expected: "YYYY-MM-DD"

//     if (!start || !end) {
//       return res.status(400).json({
//         success: false,
//         message: "Both start and end dates are required",
//       });
//     }

//     const appointments = await AppointmentsModel.find({
//       date: { $gte: start, $lte: end },
//     }).sort({ date: 1, startTime: 1 });

//     res.json({ success: true, appointments });
//   } catch (err) {
//     console.error("❌ Error fetching appointments by week:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// export const getAppointmentsByMonth = async (req, res) => {
//   try {
//     const { month } = req.query; // expected: month=2025-09

//     if (!month) {
//       return res.status(400).json({
//         success: false,
//         message: "Month is required",
//       });
//     }

//     const startDate = dayjs(`${month}-01`)
//       .startOf("month")
//       .format("YYYY-MM-DD");
//     const endDate = dayjs(startDate).endOf("month").format("YYYY-MM-DD");

//     const appointments = await AppointmentsModel.find({
//       date: { $gte: startDate, $lte: endDate },
//     }).sort({ date: 1, startTime: 1 });

//     res.json({ success: true, appointments });
//   } catch (err) {
//     console.error("❌ Error fetching appointments by month:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };
// 🔍 Search patients by name, phone, email, or patientId
export const searchPatients = async (req, res) => {
  const { query } = req.query;
  try {
    // ?query=John OR ?query=9876543210

    if (!query) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    const patients = await Patient.find({
      $or: [
        { patientName: { $regex: query, $options: "i" } }, // case-insensitive
        { patientPhone: { $regex: query, $options: "i" } },
        { patientEmail: { $regex: query, $options: "i" } },
        { patientId: { $regex: query, $options: "i" } },
      ],
    }).limit(20); // limit results for performance

    res.json({ success: true, patients });
  } catch (err) {
    console.error("❌ Error searching patients:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      previousDate,
      previousTime,
      newDate,
      newTime,
      rescheduledBy,
      reason,
    } = req.body;

    const appointment = await AppointmentsModel.findById(id);
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });

    // Push to reschedules array
    appointment.reschedules.push({
      previousDate,
      previousTime,
      newDate,
      newTime,
      rescheduledBy,
      reason,
    });

    // Update appointment with new date/time
    appointment.date = newDate;
    appointment.startTime = newTime;

    await appointment.save();

    res.json({
      success: true,
      message: "Rescheduled successfully",
      data: appointment,
    });
  } catch (err) {
    console.error("Reschedule error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const getPatients = async (req, res) => {
  try {
    const { clinicId, search = "", page = 1, limit = 5 } = req.query;

    const query = {
      clinicId,
      $or: [
        { patientName: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
        { patientPhone: { $regex: search, $options: "i" } },
      ],
    };

    const patients = await Patient.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Patient.countDocuments(query);

    res.json({ data: patients, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all appointments for a patient
export const getPatientAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Ensure the patientId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ message: "Invalid patient ID" });
    }

    // Fetch appointments using the patient ObjectId
    const appointments = await AppointmentsModel.find({ patient: patientId })
      .sort({ date: -1 }) // latest first
      .lean();

    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ---------- GET ALL APPOINTMENTS BY DAY ----------
export const getAppointmentsByDay = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date)
      return res
        .status(400)
        .json({ success: false, message: "Date is required" });

    const parsedDate = dayjs(date);
    if (!parsedDate.isValid())
      return res
        .status(400)
        .json({ success: false, message: "Invalid date format" });

    const start = parsedDate.startOf("day").toDate();
    const end = parsedDate.endOf("day").toDate();

    const appointments = await AppointmentsModel.find({
      date: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });
    res.json({
      success: true,
      total: appointments.length,
      data: appointments,
    });
  } catch (err) {
    console.error("❌ Error fetching day appointments:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------- GET ALL APPOINTMENTS BY WEEK ----------
const convertTo24H = (timeStr) => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:00`;
};

export const getAppointmentsByWeek = async (req, res) => {
  try {
    const { week } = req.query;

    if (!week)
      return res.status(400).json({
        success: false,
        message: "Week is required (YYYY-Wxx)",
      });

    const [yearStr, weekStr] = week.split("-W");
    const year = parseInt(yearStr);
    const weekNumber = parseInt(weekStr);

    if (isNaN(year) || isNaN(weekNumber))
      return res
        .status(400)
        .json({ success: false, message: "Invalid week format" });

    const start = dayjs()
      .year(year)
      .isoWeek(weekNumber)
      .startOf("isoWeek")
      .toDate();
    const end = dayjs()
      .year(year)
      .isoWeek(weekNumber)
      .endOf("isoWeek")
      .toDate();

    const appointments = await AppointmentsModel.find({
      date: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    // Combine date + startTime for DayPilot
    const mapped = appointments.map((appt) => {
      const datePart = dayjs(appt.date).format("YYYY-MM-DD");
      const startTime24 = convertTo24H(appt.startTime);
      return {
        ...appt.toObject(),
        startDateTime: `${datePart}T${startTime24}`,
      };
    });

    res.json({ success: true, total: appointments.length, data: mapped });
  } catch (err) {
    console.error("❌ Error fetching week appointments:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------- GET ALL APPOINTMENTS BY MONTH ----------
export const getAppointmentsByMonth = async (req, res) => {
  try {
    const { month } = req.query;

    if (!month)
      return res
        .status(400)
        .json({ success: false, message: "Month is required (YYYY-MM)" });

    const parsedMonth = dayjs(month + "-01");
    if (!parsedMonth.isValid())
      return res
        .status(400)
        .json({ success: false, message: "Invalid month format" });

    const start = parsedMonth.startOf("month").toDate();
    const end = parsedMonth.endOf("month").toDate();

    const appointments = await AppointmentsModel.find({
      date: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });
    res.json({
      success: true,
      total: appointments.length,
      data: appointments,
    });
  } catch (err) {
    console.error("❌ Error fetching month appointments:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
