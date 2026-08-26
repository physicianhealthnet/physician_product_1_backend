import mongoose from "mongoose";

const dentalAssessmentSchema = new mongoose.Schema(
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
      default: "",
    },
    doctorId: {
      type: String,
      default: "",
    },
    doctorName: {
      type: String,
      default: "",
    },
    medicalChecks: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    medicalNotes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    extraoral: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    intraoralNotes: {
      type: String,
      default: "",
    },
    teethStatus: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    hardTissue: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    symptomData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    treatment: {
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

export default mongoose.model("DentalAssessment", dentalAssessmentSchema);
