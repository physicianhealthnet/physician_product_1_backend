import Appointment from "../models/appointment.model.js";
import { createDBService } from "../services/db.service.js";
import admin from "firebase-admin";
import dayjs from "dayjs";
import Patient from "../models/patientModel/patient.model.js";
import { activeSockets } from "../socket/socketController.js";
import fs from "fs";
import path from "path";

const appointmentService = createDBService(Appointment);

// Safely initialize Firebase Admin SDK or mock it if key is missing to prevent crash
let isFirebaseInitialized = false;
const initializeFirebase = () => {
  if (isFirebaseInitialized) return;
  try {
    const serviceAccountPath = path.resolve("serviceAccountKey.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isFirebaseInitialized = true;
    } else {
      console.warn("serviceAccountKey.json not found. Firebase Admin SDK will run in dry-run/mock mode.");
      isFirebaseInitialized = true;
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
};

const db = {
  users: {
    getFcmToken: async (userId) => {
      const patient = await Patient.findOne({ patientId: userId, isDeleted: false });
      return patient ? patient.FCMToken : null;
    }
  }
};

export const createAppointmentContreller = async (req, res) => {
  try {
    initializeFirebase();
    const { patientId, date, startTime, endTime, doctor } = req.body;
    const userId = patientId;

    const existingAppointment = await appointmentService.getOne({
      patientId: patientId,
      date: date,
      startTime: startTime,
      endTime: endTime,
      isDeleted: false,
    });

    const liveSocket = activeSockets.get(userId);

    if (existingAppointment) {
      return res.status(400).json({
        message: "appointment already exists on this date and time",
        appointment: existingAppointment,
      });
    }
    const appointment = await appointmentService.create(req.body);

    const payload = {
      title: "Appointment Booked",
      body: `Your appointment with Dr. ${doctor || "Doctor"} at PHN 1 Clinic is confirmed for ${dayjs(date).format("DD MMM YYYY")} at ${startTime}.`,
      clinic: "PHN 1",
      status: "Booked",
      appointmentId: String(appointment._id),
      doctorName: doctor || "Doctor",
      clinicName: "PHN 1 Clinic",
      clinicLocation: "Hyderabad",
      appointmentDate: date,
      selectedSlot: startTime,
    };

    if (liveSocket && liveSocket.connected) {
      // Send instantly via WebSocket if user has the app open
      liveSocket.emit("appointment_update", payload);
      return res.status(200).json({
        success: true,
        message: "Status updated. Notified via WebSocket.",
        appointment,
      });
    } else {
      // Fetch saved token from DB if user is offline
      const fcmToken = await db.users.getFcmToken(userId);

      if (!fcmToken) {
        return res.status(200).json({
          success: true,
          message: "Status updated, but user has no push token.",
          appointment,
        });
      }

      // Build Firebase package
      const fcmMessage = {
        token: fcmToken,
        notification: { title: payload.title, body: payload.body },
        data: {
          appointmentId: payload.appointmentId,
          status: payload.status,
          type: "APPOINTMENT",
        },
      };

      // Send via Firebase
      try {
        const serviceAccountPath = path.resolve("serviceAccountKey.json");
        if (isFirebaseInitialized && fs.existsSync(serviceAccountPath)) {
          await admin.messaging().send(fcmMessage);
          console.log("FCM Push Notification Sent successfully to:", fcmToken);
        } else {
          console.log("Mock FCM send payload (dry-run):", JSON.stringify(fcmMessage));
        }
      } catch (fcmErr) {
        console.error("FCM Send failed:", fcmErr);
      }

      return res.status(200).json({
        success: true,
        message: "Status updated. Notified via FCM (dry-run/mock).",
        appointment,
      });
    }
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAllAppointmentsController = async (req, res) => {
  try {
    const appointments = await appointmentService.getAll({ isDeleted: false });
    return res.status(200).json({
      message: "Appointments retrieved successfully",
      appointments,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAllPendingAppointmentsController = async (req, res) => {
  try {
    const pendingAppointments = await appointmentService.getAll({
      status: "Pending",
      isDeleted: false,
    });

    return res.status(200).json({
      message: "Pending appointments retrieved successfully",
      appointments: pendingAppointments,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAllTodayAppointmentsController = async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // "2025-08-21"

    const todayAppointments = await appointmentService.getAll({
      date: todayStr,
      status: "Booked",
      isDeleted: false,
    });

    return res.status(200).json({
      message: "Today's appointments retrieved successfully",
      appointments: todayAppointments,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAppointmentsByClinicID = async (req, res) => {
  try {
    const clinicId = req.params.clinicId;

    if (!clinicId) {
      return res.status(400).json({ message: "Clinic ID is required" });
    }

    const appointments = await appointmentService.getAll({
      clinicId,
      isDeleted: false,
    });
    return res.status(200).json({
      message: "Appointments Fetched Successfully",
      appointments,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const editAppointmentController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ message: "Appointment ID is required" });
    }

    const updatedAppointment = await appointmentService.update(id, updateData); // ✅ pass raw string

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    return res.status(200).json({
      message: "Appointment updated successfully",
      appointment: updatedAppointment,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const deleteAppointmentController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Appointment ID is required" });
    }

    const deletedAppointment = await appointmentService.update(id, {
      isDeleted: true,
    });

    if (!deletedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    return res.status(200).json({
      message: "Appointment deleted successfully",
      Appointment: deletedAppointment,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
