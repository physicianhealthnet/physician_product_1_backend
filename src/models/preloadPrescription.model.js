import mongoose from "mongoose";
import { stringRequired } from "../config/schemaTypes.js";

const preloadPrescriptionSchema = new mongoose.Schema(
  {
    title: stringRequired,
    // age: stringRequired,
    preloadedMedicinesData: [
      {
        dosageA: stringRequired,
        dosageM: stringRequired,
        dosageN: stringRequired,
        medicine: stringRequired,
        af_bf: stringRequired,
        days: { type: Number, default: 0 },
        dosage: { type: String, default: "1" },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("preloadPrescription", preloadPrescriptionSchema);
