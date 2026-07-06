import mongoose from "mongoose";
import { string } from "../config/schemaTypes.js";

const consentFromSchema = new mongoose.Schema(
  {
    clinicId: string,
    patientId: string,
    patientName: string,
    phoneCalls: string,
    textMessage: string,
    email: string,

    guardianName: string,
    guardianSign: string,
    guardianDate: string,

    doctorName: string,
    doctorSign: string,
    doctorDate: string,

    consentDate: string,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ConsentFrom = mongoose.model("ConsentFrom", consentFromSchema);
export default ConsentFrom;
