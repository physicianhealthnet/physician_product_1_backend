import Appointment from "../models/appointment.model.js";
import { createDBService } from "../services/db.service.js";

const appointmentService = createDBService(Appointment);

export const createAppointmentContreller = async (req, res) => {
  try {
    const { patientId, date, startTime, endTime } = req.body;
    const existingAppointment = await appointmentService.getOne({
      patientId: patientId,
      date: date,
      startTime: startTime,
      endTime: endTime,
      isDeleted: false,
    });
    if (existingAppointment) {
      return res.status(400).json({
        message: "appointment already exists on this date and time",
        appointment: existingAppointment,
      });
    }
    const appointment = await appointmentService.create(req.body);
    return res.status(201).json({
      message: "Appointment created successfully",
      appointment,
    });
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
