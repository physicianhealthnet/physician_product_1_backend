import mongoose from "mongoose";
import AppointmentsModel from "./src/models/Appointments.model.js";

const MONGO_URI = "mongodb+srv://cloudoplus2023_db_user:cloudoplus@cluster0.rnzwjys.mongodb.net/physician";

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to local clinic MongoDB.");

  // Get appointments on 2026-07-24
  const start = new Date("2026-07-24T00:00:00.000Z");
  const end = new Date("2026-07-24T23:59:59.999Z");

  const appts = await AppointmentsModel.find({
    date: { $gte: start, $lte: end }
  });

  console.log(`Found ${appts.length} local appointments on 2026-07-24:`);
  for (const a of appts) {
    console.log({
      _id: a._id,
      patientName: a.patientName,
      startTime: a.startTime,
      date: a.date,
      webAppointmentId: a.webAppointmentId,
      status: a.status
    });
  }

  await mongoose.connection.close();
}

run().catch(console.error);
