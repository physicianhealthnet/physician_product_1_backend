import mongoose from "mongoose";

const GoogleTokenSchema = new mongoose.Schema(
  {
    accessToken: { type: String },
    refreshToken: { type: String, required: true },
    expiryDate: { type: Number },
  },
  {
    timestamps: true,
    collection: "google_tokens",
  }
);

const GoogleToken = mongoose.model("GoogleToken", GoogleTokenSchema);
export default GoogleToken;
