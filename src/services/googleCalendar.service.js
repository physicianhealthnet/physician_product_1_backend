import { google } from "googleapis";
import { getAuthenticatedClient } from "../config/google.js";
import dayjs from "dayjs";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Patient from "../models/patientModel/patient.model.js";

/**
 * Creates a Google Calendar event with Google Meet videoconferencing enabled.
 * If credentials are not configured, it falls back to generating a mock Meet link.
 */
export const createGoogleMeetEvent = async (appointment) => {
  try {
    const client = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth: client });

    const datePart = dayjs(appointment.date).format("YYYY-MM-DD");
    const startDateTime = dayjs(`${datePart} ${appointment.startTime}`, "YYYY-MM-DD hh:mm A").toDate();
    const endDateTime = dayjs(startDateTime).add(30, "minute").toDate();

    // Fetch doctor's and patient's emails from the DB
    let doctorEmail = null;
    let patientEmail = null;

    try {
      if (appointment.doctorId && mongoose.Types.ObjectId.isValid(appointment.doctorId)) {
        const doc = await User.findById(appointment.doctorId);
        if (doc) {
          doctorEmail = doc.email;
        }
      }
    } catch (err) {
      console.error("Failed to retrieve doctor email for event:", err);
    }

    try {
      if (appointment.patient && mongoose.Types.ObjectId.isValid(appointment.patient)) {
        const pat = await Patient.findById(appointment.patient);
        if (pat) {
          patientEmail = pat.patientEmail;
        }
      }
    } catch (err) {
      console.error("Failed to retrieve patient email for event:", err);
    }

    const attendees = [];
    if (doctorEmail) {
      attendees.push({ email: doctorEmail });
    }
    if (patientEmail) {
      attendees.push({ email: patientEmail });
    }

    const event = {
      summary: `PHN Telehealth Consultation: ${appointment.patientName}`,
      description: `Video consultation on PHN between Patient ${appointment.patientName} and Doctor ${appointment.doctor}.`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `phn-meet-${appointment._id || Math.random().toString()}-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "phn@physicianhealthnet.com",
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    console.log("EVENT RESPONSE");
    console.log(JSON.stringify(response.data, null, 2));

    const meetLink =
      response.data.hangoutLink ||
      response.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri;

    if (!meetLink) {
      console.error("Event creation response detailed data:", response.data);
      throw new Error("Google Meet URL not generated");
    }

    const match = meetLink.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/);
    const meetingId = match ? match[0] : response.data.id;

    console.log(`Created Google Meet event successfully: ${meetLink} (ID: ${meetingId})`);
    return { meetLink, meetingId };
  } catch (error) {
    console.error("Failed to create Google Calendar event:", error.message);
    if (error.response && error.response.data) {
      console.error("Detailed API Error:", JSON.stringify(error.response.data, null, 2));
    }
    // Generate a fallback to meet.new to allow starting a real meeting when Google OAuth is not connected
    return {
      meetLink: "https://meet.new",
      meetingId: "new",
      error: error.message,
    };
  }
};

/**
 * Generates a real, valid Google Meet link on demand using Google Calendar API,
 * falling back to meet.new if OAuth is not authenticated.
 */
export const createInstantMeet = async (attendeesList = []) => {
  try {
    const client = await getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth: client });

    const startDateTime = new Date();
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    const attendees = Array.isArray(attendeesList)
      ? attendeesList.filter(email => email).map(email => ({ email }))
      : [];

    const event = {
      summary: "PHN Instant Consultation",
      description: "Instant video consultation room generated from PHN.",
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "Asia/Kolkata",
      },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `phn-instant-${Date.now()}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "phn@physicianhealthnet.com",
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    console.log("INSTANT EVENT RESPONSE");
    console.log(JSON.stringify(response.data, null, 2));

    const meetLink =
      response.data.hangoutLink ||
      response.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri;

    if (!meetLink) {
      console.error("Instant event creation response detailed data:", response.data);
      throw new Error("Google Meet URL not generated");
    }
    return { success: true, meetLink };
  } catch (error) {
    console.error("Failed to create instant Meet event:", error.message);
    if (error.response && error.response.data) {
      console.error("Detailed API Error:", JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, meetLink: "https://meet.new", error: error.message };
  }
};
