import express from "express";
import {
  createAppointmentContreller,
  deleteAppointmentController,
  editAppointmentController,
  getAllAppointmentsController,
  getAllPendingAppointmentsController,
  getAllTodayAppointmentsController,
  getAppointmentsByClinicID,
} from "../controllers/appointmentController.js";

const appointmentRouter = express.Router();

appointmentRouter.post("/create", createAppointmentContreller);
appointmentRouter.get("/get-all", getAllAppointmentsController);
appointmentRouter.get("/get-all-pendings", getAllPendingAppointmentsController);
appointmentRouter.get(
  "/get-today-appointments",
  getAllTodayAppointmentsController
);
appointmentRouter.get(
  "/get-all-by-clinic/:clinicId",
  getAppointmentsByClinicID
);
appointmentRouter.put("/edit/:id", editAppointmentController);
appointmentRouter.delete("/delete/:id", deleteAppointmentController);

export default appointmentRouter;
