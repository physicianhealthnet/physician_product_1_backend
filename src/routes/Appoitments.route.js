import express from "express";
import {
  createAppointment,
  getAppointments,
  getAppointmentsByDay,
  getAppointmentsByMonth,
  getAppointmentsByWeek,
  getPatientAppointments,
  getPatients,
  rescheduleAppointment,
  searchPatients,
  updateAppointmentStatus,
} from "../controllers/Appointments.controller.js";

const appointmentsRouter = express.Router();

appointmentsRouter.post(
  "/",
  createAppointment
);
appointmentsRouter.get("/search", searchPatients);
appointmentsRouter.get("/get", getAppointments);
appointmentsRouter.get("/date", getAppointmentsByDay);
appointmentsRouter.get("/week", getAppointmentsByWeek);
appointmentsRouter.get("/month", getAppointmentsByMonth);
appointmentsRouter.get("/patients", getPatients);
appointmentsRouter.get(
  "/get-patient-appointment/:patientId",
  getPatientAppointments
);
appointmentsRouter.put("/reschedule/:id", rescheduleAppointment);
appointmentsRouter.put("/:id", updateAppointmentStatus); // Reusing createAppointment for update

export default appointmentsRouter;
