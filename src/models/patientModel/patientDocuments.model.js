import mongoose from "mongoose";
import { string, stringRequired } from "../../config/schemaTypes.js";

const patientDocumentsSchema = new mongoose.Schema(
  {
    patientId: stringRequired,
    treatment_status: stringRequired,
    doctorId: { type: String, default: "" },
    doctorName: { type: String, default: "" },
    treatment_id: string,
    documentName: stringRequired,
    documentPath: stringRequired,
    clinicName: { type: String, default: "" },
    recordDate: { type: String, default: "" },
    documentType: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PatientDocuments = mongoose.model(
  "PatientDocuments",
  patientDocumentsSchema
);
export default PatientDocuments;
