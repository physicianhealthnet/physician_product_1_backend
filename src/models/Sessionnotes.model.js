import mongoose from "mongoose";
import { string, stringRequired } from "../config/schemaTypes.js";

const sessionNotesSchema = new mongoose.Schema({
  clinicId: stringRequired,
  patientId: stringRequired,
  treatment_status: stringRequired,
  treatment_id: string,
  sessionNotes: string,
  sessionDate: string,
  isDeleted: { type: Boolean, default: false },
});

const SessionNotes = mongoose.model("SessionNotes", sessionNotesSchema);
export default SessionNotes;
