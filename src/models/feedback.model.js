import mongoose from "mongoose";
import { number, string, stringRequired } from "../config/schemaTypes.js";

const feedbackSchema = new mongoose.Schema(
  {
    clinicId: stringRequired,
    patientId: stringRequired,
    patientName: string,
    patientGender: string,
    patientAge: string,
    patientPhone: string,

    // Service
    overallExperience: number,
    politeAndProfessional: string,
    treatmentExplainedClearly: string,
    painAddressedEffectively: string,

    // Clinic/Facility
    waitingTimeSatisfaction: string,
    cleanlinessComfort: number,
    appointmentEase: number,

    // Outcome
    improvementAfterTreatment: string,
    recommendClinic: string,
    // Suggestions / Comments
    remarks: string,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;
