import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema({
  appointmentId: { type: String, required: true }, // auto-generated
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
  },
  patientId: { type: String, required: true },
  clinicId: { type: String, required: true },
  patientName: { type: String, required: true },
  patientAadhar: { type: String },
  phoneNumber: { type: String },
  doctor: { type: String, required: true }, // PT Name
  doctorId: { type: mongoose.Schema.ObjectId, ref: "user" },
  category: {
    type: String,
  },
  date: { type: Date, required: true }, // "YYYY-MM-DD"
  startTime: { type: String, required: true }, // "hh:mm A"
  status: {
    type: String,
    enum: [
      "Booked",
      "Checked-in",
      "Engaged",
      "Completed",
      "Checked-out",
      "Cancelled",
    ],
    default: "Booked",
  },

  // Status timestamps
  bookedAt: { type: Date, default: Date.now },
  checkedInAt: { type: Date },
  checkedOutAt: { type: Date },
  engagedStartAt: { type: Date },
  engagedEndAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  // Cancel details
  cancelReason: { type: String },
  cancelledBy: { type: String, enum: ["Patient", "PT"] },
  reschedules: [
    {
      previousDate: { type: Date, required: true },
      previousTime: { type: String, required: true },
      newDate: { type: Date, required: true },
      newTime: { type: String, required: true },
      rescheduledAt: { type: Date, default: Date.now },
      rescheduledBy: { type: String, enum: ["Patient", "PT"] },
      reason: { type: String }, // optional reason
    },
  ],
  isDeleted: { type: Boolean, default: false },
  webAppointmentId: { type: String }, // Link to external/web appointment ID
  meetLink: { type: String },
  meetingId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
// Middleware to update `updatedAt`
AppointmentSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});
const AppointmentsModel = mongoose.model(
  "Sagar_Appointment",
  AppointmentSchema
);

export default AppointmentsModel;
