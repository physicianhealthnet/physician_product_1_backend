import mongoose from "mongoose";

const ClinicalNoteSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sagar_Appointment",
      required: true,
    },
    transcript: { type: String },
    summary: { type: String },
    chiefComplaint: { type: String },
    history: { type: String },
    examinationFindings: { type: String },
    assessment: { type: String },
    diagnosis: { type: String },
    treatmentPlan: { type: String },
    homeExerciseProgram: { type: String },
    followUp: { type: String },
  },
  {
    timestamps: true,
    collection: "clinical_notes",
  }
);

const ClinicalNote = mongoose.model("ClinicalNote", ClinicalNoteSchema);
export default ClinicalNote;
