import mongoose from "mongoose";
import MeetingTranscript from "./src/models/MeetingTranscript.model.js";

const MONGO_URI="mongodb+srv://cloudoplus2023_db_user:cloudoplus@cluster0.rnzwjys.mongodb.net/physician";

async function check() {
  await mongoose.connect(MONGO_URI);
  const data = await MeetingTranscript.find({});
  console.log("Transcripts:", data);
  mongoose.disconnect();
}
check();
