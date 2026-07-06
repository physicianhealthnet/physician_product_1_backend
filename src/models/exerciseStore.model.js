import mongoose from "mongoose";

const exerciseStoreSchema = new mongoose.Schema({
  fileCatogery: String,
  fileName: String,
  filePath: String,
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("ExerciseStore", exerciseStoreSchema);
