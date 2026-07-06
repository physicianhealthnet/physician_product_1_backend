import { google } from "googleapis";
import dotenv from "dotenv";
import GoogleToken from "../models/GoogleToken.model.js";

dotenv.config({ override: true });

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
}

export const getAuthenticatedClient = async () => {
  try {
    const dbToken = await GoogleToken.findOne().sort({ createdAt: -1 });
    if (dbToken && dbToken.refreshToken) {
      oauth2Client.setCredentials({
        access_token: dbToken.accessToken,
        refresh_token: dbToken.refreshToken,
        expiry_date: dbToken.expiryDate,
      });
      return oauth2Client;
    }
  } catch (err) {
    console.error("Error loading Google token from DB:", err);
  }

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    return oauth2Client;
  }

  throw new Error("No Google credentials or refresh token available.");
}; 