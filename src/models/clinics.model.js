import mongoose from "mongoose";
import { string, uniqueString, uniqueStringRequired } from "../config/schemaTypes.js";

const clinicSchema = new mongoose.Schema(
  {
    clinicId: uniqueStringRequired,
    clinicName: {
      type: String,
      required: true,
    },
    clinicAddress: string,
    clinicPhone: string,
    clinicEmail: uniqueString,
    clinicLocation: string,
    clinicDescription: string,
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const clinicData = mongoose.model("clinics", clinicSchema);
export default clinicData;
