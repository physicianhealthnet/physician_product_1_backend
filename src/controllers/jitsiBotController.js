import { startRecording, stopRecording } from "../services/jitsiBotService.js";

export const startRecord = async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName) {
      return res.status(400).json({ success: false, message: "Room name is required" });
    }

    // Since puppeteer takes some time to start, we can respond immediately 
    // or wait for the browser to launch. For reliability, we wait.
    const filePath = await startRecording(roomName);

    if (filePath) {
      return res.status(200).json({ success: true, message: "Recording started", filePath });
    } else {
      return res.status(500).json({ success: false, message: "Failed to start recording or already recording" });
    }
  } catch (error) {
    console.error("Error in startRecord controller:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message, stack: error.stack });
  }
};

export const stopRecord = async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName) {
      return res.status(400).json({ success: false, message: "Room name is required" });
    }

    const savedFilePath = await stopRecording(roomName);

    if (savedFilePath) {
      return res.status(200).json({ success: true, message: "Recording stopped and saved", fileUrl: savedFilePath });
    } else {
      return res.status(500).json({ success: false, message: "Failed to stop recording or no recording active" });
    }
  } catch (error) {
    console.error("Error in stopRecord controller:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MeetingTranscript from "../models/MeetingTranscript.model.js";
import AppointmentsModel from "../models/Appointments.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const saveTranscript = async (req, res) => {
  try {
    const { roomName, transcript } = req.body;
    if (!roomName || !Array.isArray(transcript)) {
      return res.status(400).json({ success: false, message: "Room name and transcript array are required" });
    }

    const uploadDir = path.join(__dirname, '..', '..', 'public', 'upload', 'jitsi-recordings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${roomName}-transcript-${Date.now()}.txt`;
    const filePath = path.join(uploadDir, fileName);

    let transcriptContent = `Transcript for room: ${roomName}\n`;
    transcriptContent += `Generated at: ${new Date().toISOString()}\n\n`;
    
    transcript.forEach(item => {
      const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "";
      const sender = item.sender || "Unknown";
      const text = item.text || "";
      transcriptContent += `[${time}] ${sender}: ${text}\n`;
    });

    fs.writeFileSync(filePath, transcriptContent, 'utf-8');

    let appointmentId = null;
    try {
      // Try to find if this room is linked to an appointment
      const appointment = await AppointmentsModel.findOne({ meetingId: roomName });
      if (appointment) {
        appointmentId = appointment._id;
      }

      const existingTranscript = await MeetingTranscript.findOne({ roomName: roomName });
      if (existingTranscript) {
        existingTranscript.transcript = transcriptContent;
        if (appointmentId && !existingTranscript.appointmentId) {
          existingTranscript.appointmentId = appointmentId;
        }
        await existingTranscript.save();
      } else {
        const transcriptData = {
          roomName: roomName,
          transcript: transcriptContent
        };
        if (appointmentId) {
          transcriptData.appointmentId = appointmentId;
        }
        await MeetingTranscript.create(transcriptData);
      }
    } catch (dbErr) {
      console.error("Error saving transcript to DB:", dbErr);
    }
    
    const relativePath = `/uploads/jitsi-recordings/${fileName}`;
    return res.status(200).json({ success: true, message: "Transcript saved successfully", fileUrl: relativePath });
  } catch (error) {
    console.error("Error in saveTranscript controller:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
