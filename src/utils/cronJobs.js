import cron from "node-cron";
import dayjs from "dayjs";
import ScanPrescription from "../models/scanPrescription.model.js";
import LabPrescription from "../models/labPrescription.model.js";
import { handleWhatsAppNotification } from "./notification.helper.js";
import { syncGoogleDriveRecordings } from "../services/googleSync.service.js";

/**
 * Initializes all cron jobs for the backend
 */
export const initCronJobs = () => {
    console.log("[Cron Jobs] Initializing WhatsApp Reminder Cron...");

    // Run every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
        console.log("[Cron Job] Checking for upcoming appointments (1-hour reminder)...");

        try {
            const now = dayjs();
            const oneHourFromNow = now.add(1, "hour");
            
            // Look for appointments in the next 45 to 75 minutes
            const startTime = oneHourFromNow.subtract(15, "minutes").toDate();
            const endTime = oneHourFromNow.add(15, "minutes").toDate();

            // 1. SCAN REMINDERS
            const upcomingScans = await ScanPrescription.find({
                status: "Scheduled",
                appointmentDateTime: {
                    $gte: startTime,
                    $lte: endTime
                },
                reminderSent: { $ne: true },
                isDeleted: false
            });

            console.log(`[Cron Job] Found ${upcomingScans.length} upcoming scans for reminders.`);

            for (const scan of upcomingScans) {
                console.log(`[Cron Job] Sending reminder to ${scan.ptrName} for ${scan.scanType}`);
                
                await handleWhatsAppNotification(
                    null,
                    scan,
                    { patientId: scan.patientId, PHN_ID: scan.PHN_ID, ptNo: scan.ptNo },
                    "scan_reminder"
                );

                scan.reminderSent = true;
                await scan.save();
            }

            // 2. LAB REMINDERS
            const upcomingLabs = await LabPrescription.find({
                status: "Scheduled",
                appointmentDateTime: {
                    $gte: startTime,
                    $lte: endTime
                },
                reminderSent: { $ne: true },
                isDeleted: false
            });

            console.log(`[Cron Job] Found ${upcomingLabs.length} upcoming labs for reminders.`);

            for (const lab of upcomingLabs) {
                console.log(`[Cron Job] Sending reminder to ${lab.ptrName} for ${lab.labType}`);
                
                await handleWhatsAppNotification(
                    null,
                    lab,
                    { patientId: lab.patientId, PHN_ID: lab.PHN_ID, ptNo: lab.ptNo },
                    "lab_reminder"
                );

                lab.reminderSent = true;
                await lab.save();
            }

        } catch (error) {
            console.error("[Cron Job Error] Reminders:", error.message);
        }
    });

    // Google Meet + Drive Sync Cron - Run every 5 minutes
    console.log("[Cron Jobs] Initializing Google Meet + Drive Sync Cron...");
    cron.schedule("*/5 * * * *", async () => {
        console.log("[Cron Job] Running Google Drive Recordings sync job...");
        try {
            await syncGoogleDriveRecordings();
        } catch (error) {
            console.error("[Cron Job Error] Google Drive Sync:", error.message);
        }
    });
};
