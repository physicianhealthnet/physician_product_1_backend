import mongoose from "mongoose";

const scanPrescriptionSchema = new mongoose.Schema(
  {
    PHN_ID: {type: String, required: true},
    prescriptionId: { type: String, required: true },
    patientId: { type: String, required: true },
    clinicId: { type: String, required: true },
    ptrName: { type: String, required: true },
    ptNo: { type: String, required: true },
    drName: { type: String, required: true },
    doctorId: { type: String, default: "" },
    scanType: { type: String, required: true }, // e.g., "MRI Brain", "CT Scan"
    scanCenter: { type: String, enum: ["Internal", "External"], default: "Internal" },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    status: {
      type: String,
      enum: ["Not Scheduled", "Scheduled", "Completed", "Missing", "Report Not Ready", "Not Reviewed"],
      default: "Not Scheduled",
    },
    finalReportNotes: { type: String, default: "" },
    finalReportFileUrl: { type: String, default: "" },
    finalReportFileUrls: [{ type: String }],
    appointmentDateTime: { type: Date, default: null },
    reminderSent: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

export default mongoose.model("ScanPrescription", scanPrescriptionSchema);
