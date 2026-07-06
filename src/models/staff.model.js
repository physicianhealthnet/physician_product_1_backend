import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      required: true,
      enum: [
        "Receptionist",
        "receptionist",
        "Accountant",
        "Nurse",
        "Lab Technician",
        "Billing Staff",
        "Manager",
        "Admin",
      ],
    },

    clinicId: {
      type: String,
    },

    clinicName: {
      type: String,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
    },

    status: {
      type: String,
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Staff", staffSchema);
