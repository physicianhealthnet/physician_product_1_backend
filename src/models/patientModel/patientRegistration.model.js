import mongoose from "mongoose";
import {
  arrayOfObject,
  string,
  stringRequired,
} from "../../config/schemaTypes.js";

const patientRegistrationSchema = new mongoose.Schema(
  {
    // === BASIC PATIENT DETAILS ===
    PHN_ID: string,
    clinicId: stringRequired,
    patientId: stringRequired,
    patientName: string,
    patientPhone: string,
    patientEmail: string,
    patientAddress: string,
    patientAge: string,
    patientDOB: string,
    patientGender: string,
    patientAadhar: string,
    guardianName: string,
    attenderPhone: string,
    attenderRelationship: string,
    location: string,

    // === PHYSICIAN HISTORY ===
    lastPhysicianVisit: string,
    previousTreatments: string,
    historyExtraction: string,
    conditions: string,
    medications: string,
    orthodontic: string,
    duration: string,

    primaryComplaint: string,
    physicianReason: string,

    // === HABITS ===
    floss: string,
    smoking: string,
    alcohol: string,
    bruxism: string,

    // === SYMPTOMS ===
    gumsBleed: string,
    sensitivity: string,
    painScore: string,

    // === OTHER MEDICAL INFO ===
    allergies: string,
    pregnant: string,
    relationship: string,
    underCare: string,

    bp: string,
    rbs: string,

    symptomData: arrayOfObject,

    treatment_status: stringRequired,
    treatment_id: string,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const PatientRegistration = mongoose.model(
  "PatientRegistration",
  patientRegistrationSchema
);
export default PatientRegistration;
