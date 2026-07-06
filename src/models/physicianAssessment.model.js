// models/physicianAssessment.model.js
import mongoose from "mongoose";

const treatmentDiagnosisSchema = new mongoose.Schema({
  date: { type: String, required: true },
  doctorName: { type: String, default: "" },
  primaryComplaint: { type: String, default: "" },
  primaryComplaintDetails: { type: String, default: "" },
  previousMedicalHistory: { type: String, default: "" },
  text: { type: String, required: true }, // This acts as the diagnosis report
  prescriptionGiven: { type: String, default: "No" },
  bloodTestGiven: { type: String, default: "No" },
  xrayGiven: { type: String, default: "No" },
  ctScanGiven: { type: String, default: "No" },
  mriGiven: { type: String, default: "No" },
  doctorId: { type: String, default: "" },
});

const treatmentPlanSchema = new mongoose.Schema({
  date: { type: String, required: true },
  doctorName: { type: String, default: "" },
  primaryComplaint: { type: String, default: "" },
  primaryComplaintDetails: { type: String, default: "" },
  previousMedicalHistory: { type: String, default: "" },
  diagnosisReport: { type: String, default: "" },
  text: { type: String, required: true }, // This acts as the treatment plan text
  prescriptionGiven: { type: String, default: "No" },
  bloodTestGiven: { type: String, default: "No" },
  xrayGiven: { type: String, default: "No" },
  ctScanGiven: { type: String, default: "No" },
  mriGiven: { type: String, default: "No" },
  nextVisitDate: { type: String, default: "" },
  nextVisitFollowUp: { type: String, default: "" },
  doctorId: { type: String, default: "" },
});

const complaintSchema = new mongoose.Schema({
  text: { type: String, required: true },
  details: { type: String, default: "" },
  date: { type: String, required: true },
  doctorId: { type: String, default: "" },
  doctorName: { type: String, default: "" },
});

const vitalsSchema = new mongoose.Schema({
  date: { type: String, default: "" },
  bloodPressure: { type: String, default: "" },
  bloodPressureCondition: { type: String, default: "" },
  pulseRate: { type: String, default: "" },
  pulseRateCondition: { type: String, default: "" },
  temperature: { type: String, default: "" },
  temperatureCondition: { type: String, default: "" },
  respiratoryRate: { type: String, default: "" },
  respiratoryRateCondition: { type: String, default: "" },
  spO2: { type: String, default: "" },
  spO2Condition: { type: String, default: "" },
  height: { type: String, default: "" },
  weight: { type: String, default: "" },
  bmi: { type: String, default: "" },
  bmiCondition: { type: String, default: "" },
  bloodSugarFasting: { type: String, default: "" },
  bloodSugarAfterFood: { type: String, default: "" },
});

const systemicExaminationSchema = new mongoose.Schema({
  cvs: { type: String, default: "" },
  rs: { type: String, default: "" },
  cns: { type: String, default: "" },
  pa: { type: String, default: "" },
});

const physicianAssessmentSchema = new mongoose.Schema(
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

    // === Physician Assessment Data ===
    medicalChecks: { type: Object, default: {} },
    medicalNotes: { type: Object, default: {} },
    chiefComplaints: { type: String, default: "" },
    chiefComplaintsList: { type: [complaintSchema], default: [] },
    historyOfPresentIllness: { type: String, default: "" },
    historyOfPresentIllnessList: { type: [complaintSchema], default: [] },
    vitals: { type: [vitalsSchema], default: [] },
    generalExamination: { type: String, default: "" },
    systemicExamination: { type: systemicExaminationSchema, default: () => ({}) },

    treatment: {
      diagnosis: [treatmentDiagnosisSchema],
      plan: [treatmentPlanSchema],
      cost: String,
      followUp: String,
      consent: Boolean,
    },
    treatment_status: { type: String, default: "live" },
    treatment_id: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("PhysicianAssessment", physicianAssessmentSchema);
