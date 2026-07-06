import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {Array} options.attachments - Optional attachments
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        const info = await transporter.sendMail({
            from: `"Sai Physician" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
            attachments,
        });
        console.log("Message sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};
