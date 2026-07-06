import mongoose from "mongoose";

const upcomingSessionSchema = new mongoose.Schema({
  sessionNo: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  vas: {
    type: String,
    default: "",
  },
  protocol: {
    type: String,
    default: "",
  },
  treatments: [
    {
      type: String,
      default: "",
    },
  ],
  teethStatus: {
    type: Object,
    default: {},
  },
  homeAdvice: {
    type: String,
    default: "",
  },
  notes: {
    type: String,
    default: "",
  },
  nextReview: {
    type: String,
    default: "",
  },
  startTime: {
    type: String,
    default: "",
    required: true,
  },
  doctor: {
    type: String,
    default: "",
  },
  patientId: {
    type: String,
    required: true,
  },
  clinicId: {
    type: String,
    required: true,
  },
  patientName: {
    type: String,
    required: true,
  },
  patientPhone: {
    type: String,
  },
  patientAddress: {
    type: String,
  },
});

const treatmentTrackerSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
    },
    clinicId: {
      type: String,
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientPhone: {
      type: String,
    },
    patientAddress: {
      type: String,
    },
    treatment_status: {
      type: String,
      required: true,
    },
    treatment_id: {
      type: String,
    },
    sessionNo: {
      type: Number,
      required: true,
      default: 1,
    },
    date: {
      type: String,
      required: true,
    },
    protocol: {
      type: String,
      default: "",
    },
    treatments: [
      {
        type: String,
        default: "",
      },
    ],
    teethStatus: {
      type: Object,
      default: {},
    },
    homeAdvice: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    nextReview: {
      type: String,
      default: "",
    },
    startTime: {
      type: String,
      default: "",
      required: true,
    },
    doctor: {
      type: String,
      default: "",
    },
    upcomming_sessions: [upcomingSessionSchema],
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("TreatmentTracker", treatmentTrackerSchema);
