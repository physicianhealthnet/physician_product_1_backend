import mongoose from "mongoose";
import Appointment from "./models/appointment.model.js";
import AppointmentsModel from "./models/Appointments.model.js";

async function run() {
  await mongoose.connect("mongodb://localhost:27017/wellclinic"); // guessing db name from typical MERN, let me check .env instead. I'll just check the DB config:
  console.log("Checking appointments...");
}
run();
