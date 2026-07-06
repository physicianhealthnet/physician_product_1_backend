import mongoose from "mongoose";
import { number, string, stringRequired } from "../config/schemaTypes.js";

const exerciseSchema = new mongoose.Schema(
  {
    clinicId: stringRequired,
    patientId: stringRequired,
    exercise_cat: string,
    name_of_exercise: string,
    reps: number,
    sets: number,
    no_of_days: number,
    end_date: string,
    payment: number,
    link: string,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Exercise = mongoose.model("Exercise", exerciseSchema);
export default Exercise;
