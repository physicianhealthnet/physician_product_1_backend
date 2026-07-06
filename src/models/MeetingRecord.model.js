import mongoose from "mongoose";

const MeetingRecordSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sagar_Appointment",
      required: true,
    },
    driveFileId: { type: String, required: true },
    fileName: { type: String },
    driveUrl: { type: String },
    recordingCreatedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "meeting_records",
  }
);

const MeetingRecord = mongoose.model("MeetingRecord", MeetingRecordSchema);
export default MeetingRecord;
