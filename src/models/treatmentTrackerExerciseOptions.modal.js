import mongoose from "mongoose";

const exerciseOptions = new mongoose.Schema([
  {
    options: {
      type: String,
    },
  },
]);

export default mongoose.model(
  "treatmentTrackerExerciseOptions",
  exerciseOptions
);
