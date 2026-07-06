import mongoose from "mongoose";
import { string, stringRequired } from "../config/schemaTypes.js";

const appointmentSchema = new mongoose.Schema(
  {
    clinicId: string,
    patientId: string,
    doctor: string,
    date: string,
    startTime: string,
    endTime: string,
    color: string,
    type: string,
    status: string,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
