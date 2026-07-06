import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
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

    department: {
      type: String,
      required: true,
    },

    clinicId: {
      type: String,
    },

    clinicName: {
      type: String,
    },

    clinicAddress: {
      type: String,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
    },

    role: {
      type: String,
      default: "doctor",
    },

    status: {
      type: String,
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Doctor", doctorSchema);
