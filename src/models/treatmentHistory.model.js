import mongoose from "mongoose";
import {
  arrayOfString,
  arrayOfStringRequired,
  string,
  stringRequired,
} from "../config/schemaTypes.js";

const treatmentHistorySchema = new mongoose.Schema(
  {
    clinicId: stringRequired,
    patientId: stringRequired,
    treatmentId: stringRequired,
    date: stringRequired,
    medicalInformationId: stringRequired,
    billsId: arrayOfStringRequired,
    patientDocumentId: arrayOfString,
    treatmentTrackerId: arrayOfString,
    sessionNotesId: arrayOfString,
    assessmentId: stringRequired,
    prescriptionId: arrayOfString,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const TreatmentHistory = mongoose.model(
  "TreatmentHistory",
  treatmentHistorySchema
);
export default TreatmentHistory;
