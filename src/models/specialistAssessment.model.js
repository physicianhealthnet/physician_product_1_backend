import mongoose from "mongoose";

const specialistAssessmentSchema = new mongoose.Schema(
  {
    clinicId: {
      type: String,
      required: true,
    },
    patientId: {
      type: String,
      required: true,
    },
    phnId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      default: "",
    },
    doctorName: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      required: true,
    },
    assessmentData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SpecialistAssessment", specialistAssessmentSchema);
