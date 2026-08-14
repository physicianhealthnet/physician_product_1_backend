import mongoose from "mongoose";
import { stringRequired, uniqueStringRequired } from "../config/schemaTypes.js";

const userSchema = new mongoose.Schema(
  {
    userId: uniqueStringRequired,
    userName: stringRequired,
    userType: {
      type: String,
      required: true,
      enum: [
        "master",
        "doctor",
        "accountant",
        "generalManager",
        "receptionist",
        "patient",
      ],
    },
    password: stringRequired,
    email: stringRequired,
    phone: stringRequired,
    clinicId: stringRequired,
    department: { type: String },
    isDeleted: { type: Boolean, default: false },
    isFirstLogin: { type: Boolean, default: true },
    fcmTokens: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("user", userSchema);
export default User;
