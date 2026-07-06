import mongoose from "mongoose";
import { stringRequired, string, number } from "../config/schemaTypes.js";

const prescriptionSchema = new mongoose.Schema(
  {
    PHN_ID:stringRequired,
    prescriptionId: stringRequired,
    patientId: stringRequired,
    clinicId: stringRequired,
    doctorId: { type: String, default: "" },
    doctorName: { type: String, default: "" },
    treatment_id: string,
    treatment_status: {
      type: String,
      default: "live",
    },
    patientName: stringRequired,
    patientAge: number,
    patientGender: stringRequired,
    medicinesData: [
      {
        morning: number,
        afternoon: number,
        night: number,
        medication: stringRequired,
        dosage: { type: String, default: "1" },
        af_bf: stringRequired,
        days: { type: Number, default: 0 },
      },
    ],
    isRefillable: { type: Boolean, default: false },
    refillLimit: { type: Number, default: 0 },
    refillCount: { type: Number, default: 0 },
    dispenseStatus: {
      type: String,
      enum: ["Pending", "Partially Dispensed", "Fully Dispensed"],
      default: "Pending",
    },
    aiPharmacyReport: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Adds createdAt and upd atedAt
  }
);

export default mongoose.model("Prescription", prescriptionSchema);
