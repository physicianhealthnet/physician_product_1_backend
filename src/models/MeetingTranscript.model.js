import mongoose from "mongoose";

const MeetingTranscriptSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sagar_Appointment",
      required: true,
    },
    transcript: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "meeting_transcripts",
  }
);

const MeetingTranscript = mongoose.model("MeetingTranscript", MeetingTranscriptSchema);
export default MeetingTranscript;
