import mongoose from "mongoose";

const doctorPerformanceSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: true,
      unique: true,
    },
    doctorName: {
      type: String,
      required: true,
    },
    clinicId: {
      type: String,
      required: true,
    },
    totalPatientsHandled: {
      type: Number,
      default: 0,
    },
    appointmentsHandled: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    // Optional: breakdowns could be added here
  },
  { timestamps: true }
);

export default mongoose.model("DoctorPerformance", doctorPerformanceSchema);
