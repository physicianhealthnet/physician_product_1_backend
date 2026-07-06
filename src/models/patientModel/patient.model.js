import mongoose from "mongoose";
import {
  string,
  arrayOfString,
  stringRequired,
  uniqueStringRequired,
} from "../../config/schemaTypes.js";

const patientSchema = new mongoose.Schema(
  {
    PHN_ID: string,
    clinicId: arrayOfString,
    isDeleted: { type: Boolean, default: false },
    patientId: uniqueStringRequired,
    patientName: stringRequired,
    patientPhone: string,
    patientAddress: string,
    patientEmail: string,
    patientDOB: string,
    patientGender: string,
    patientAge: string,
    patientAadhar: string,
    guardianName: string,
    attenderPhone: string,
    attenderRelationship: string,
    location: string,
    ref_dr_name: string,
    ref_dr_id: string,
    profileImg: string,
    password: { type: String, minlength: 6 },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook for password hashing
patientSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const bcrypt = (await import("bcryptjs")).default;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
patientSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    const bcrypt = (await import("bcryptjs")).default;
    return bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

const Patient = mongoose.model("Patient", patientSchema);
export default Patient;
