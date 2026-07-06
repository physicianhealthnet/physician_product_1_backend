import mongoose from "mongoose";

const homeAdviseOptions = new mongoose.Schema({
  options: {
    type: String,
  },
});

export default mongoose.model(
  "treatmentTrackerHomeAdviseOptions",
  homeAdviseOptions
);
