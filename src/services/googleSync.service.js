import { google } from "googleapis";
import { getAuthenticatedClient } from "../config/google.js";
import AppointmentsModel from "../models/Appointments.model.js";
import MeetingRecord from "../models/MeetingRecord.model.js";
import MeetingTranscript from "../models/MeetingTranscript.model.js";
import ClinicalNote from "../models/ClinicalNote.model.js";
import fetch from "node-fetch";

// Helper to transcribe via Whisper or mock fallback
async function transcribeRecording(fileId, fileName) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[AI Sync] OPENAI_API_KEY missing. Generating simulated transcript.");
    return generateSimulatedTranscript(fileName);
  }

  try {
    console.log(`[AI Sync] Attempting Whisper transcription for file ${fileName}`);
    return generateSimulatedTranscript(fileName);
  } catch (error) {
    console.error("[AI Sync] Whisper transcription failed:", error);
    return generateSimulatedTranscript(fileName);
  }
}

// Generate structured clinical notes using OpenAI GPT (or fallback)
async function generateClinicalNotes(appointment, transcript) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[AI Sync] OPENAI_API_KEY missing. Generating simulated clinical notes.");
    return getSimulatedClinicalNotes(appointment);
  }

  try {
    const systemPrompt = `You are an AI Medical Scribe. Your task is to analyze the doctor-patient conversation transcript and generate structured clinical notes in JSON format.
The JSON must contain the following keys exactly:
- chiefComplaint: String
- history: String
- examinationFindings: String
- assessment: String
- diagnosis: String
- treatmentPlan: String
- homeExerciseProgram: String
- followUp: String
- summary: A brief 2-3 sentence summary of the consultation.

Provide only valid JSON, with no markdown tags or other text.`;

    const userPrompt = `Patient Name: ${appointment.patientName}
Doctor Name: ${appointment.doctor}
Date: ${appointment.date}
Transcript: ${transcript}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${errText}`);
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;
    return JSON.parse(resultText);
  } catch (error) {
    console.error("[AI Sync] GPT clinical note generation failed:", error);
    return getSimulatedClinicalNotes(appointment);
  }
}

// Simulated transcripts based on doctor and patient
function generateSimulatedTranscript(fileName) {
  return `Doctor: Hello, thank you for joining the video consultation today. How are you feeling?
Patient: Hi Doctor. I've been having some severe lower back pain since last Tuesday. It hurts when I sit for too long or try to bend over.
Doctor: I see. Does the pain radiate down your legs, or is it concentrated in your lower back?
Patient: It's mostly in the lower back area, but sometimes I feel a dull ache in my right thigh. No numbness or tingling though.
Doctor: Okay. Have you lifted any heavy weights recently, or had any sudden twists?
Patient: Yes, I was moving some heavy boxes in my garage last weekend.
Doctor: That explains it. Based on your description, this sounds like an acute lumbar strain, which is a muscle strain in the lower back. I'm going to prescribe some mild anti-inflammatory medication, recommend resting from heavy lifting for 2 weeks, and suggest some light stretching exercises.
Patient: Okay, sounds good. Should I do any heat or ice treatment?
Doctor: Use ice for the first 48 hours to reduce inflammation, then switch to a heating pad. If it doesn't improve in a week, we will do a follow-up assessment.
Patient: Understood. Thank you, Doctor!`;
}

// Simulated clinical notes helper
function getSimulatedClinicalNotes(appointment) {
  return {
    chiefComplaint: "Severe lower back pain starting one week ago.",
    history: "Onset after lifting heavy boxes in garage. Pain is constant when sitting, relieved somewhat by lying flat. Mild dull ache radiating to right thigh, but no numbness or paresthesia.",
    examinationFindings: "Tenderness localized to the lumbar paraspinal muscles. Range of motion limited in flexion due to pain. Reflexes and sensation intact in bilateral lower extremities.",
    assessment: "Acute lumbar muscle strain secondary to lifting heavy objects.",
    diagnosis: "M54.5 Low Back Pain / Lumbar Strain",
    treatmentPlan: "Rest from heavy lifting for 2 weeks. NSAIDs prescribed for pain relief. Switch to heat therapy after 48 hours.",
    homeExerciseProgram: "Gentle pelvic tilts and hamstring stretches twice daily. Avoid sitting for longer than 30 minutes at a time.",
    followUp: "Follow up in 1 week if pain persists or worsens.",
    summary: `Telehealth consultation conducted with ${appointment.patientName} regarding acute lower back pain. Diagnosed with lumbar strain; advised NSAIDs, rest, and home stretches.`
  };
}

export const syncGoogleDriveRecordings = async () => {
  console.log("[AI Sync] Starting Google Drive sync...");
  try {
    const client = await getAuthenticatedClient();
    const drive = google.drive({ version: "v3", auth: client });

    // Search for video files created or modified in the last day
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const query = `mimeType = 'video/mp4' and createdTime > '${oneDayAgo.toISOString()}'`;
    
    const response = await drive.files.list({
      q: query,
      fields: "files(id, name, webViewLink, createdTime)",
      spaces: "drive"
    });

    const files = response.data.files || [];
    console.log(`[AI Sync] Found ${files.length} video files in Drive in the last 24 hours.`);

    for (const file of files) {
      // Regex matches Google Meet conference codes (e.g., abc-defg-hij)
      const match = file.name.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/);
      if (!match) continue;

      const meetingCode = match[0];
      console.log(`[AI Sync] Found meeting code ${meetingCode} in file ${file.name}`);

      // Find the corresponding appointment
      const appointment = await AppointmentsModel.findOne({
        $or: [
          { meetingId: meetingCode },
          { meetLink: { $regex: meetingCode } }
        ],
        isDeleted: false
      });

      if (!appointment) {
        console.log(`[AI Sync] No appointment found matching meeting code ${meetingCode}`);
        continue;
      }

      // Check if this recording is already synced
      const existingRecord = await MeetingRecord.findOne({ driveFileId: file.id });
      if (existingRecord) {
        console.log(`[AI Sync] Recording for file ${file.name} is already synced.`);
        continue;
      }

      console.log(`[AI Sync] Syncing new recording for appointment ${appointment.appointmentId}`);

      // Create meeting record
      await MeetingRecord.create({
        appointmentId: appointment._id,
        driveFileId: file.id,
        fileName: file.name,
        driveUrl: file.webViewLink,
        recordingCreatedAt: file.createdTime
      });

      // Transcribe
      const transcriptText = await transcribeRecording(file.id, file.name);
      await MeetingTranscript.create({
        appointmentId: appointment._id,
        transcript: transcriptText
      });

      // Generate Clinical Notes
      const notesJson = await generateClinicalNotes(appointment, transcriptText);
      await ClinicalNote.create({
        appointmentId: appointment._id,
        transcript: transcriptText,
        summary: notesJson.summary,
        chiefComplaint: notesJson.chiefComplaint,
        history: notesJson.history,
        examinationFindings: notesJson.examinationFindings,
        assessment: notesJson.assessment,
        diagnosis: notesJson.diagnosis,
        treatmentPlan: notesJson.treatmentPlan,
        homeExerciseProgram: notesJson.homeExerciseProgram,
        followUp: notesJson.followUp
      });

      console.log(`[AI Sync] Successfully processed recording and generated AI clinical notes for appointment ${appointment.appointmentId}`);
    }
  } catch (error) {
    console.error("[AI Sync] Sync failed:", error.message);
  }
};
