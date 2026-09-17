import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create a reusable transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Send an email to the User (Patient)
 * @param {string} userEmail - The patient's email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email body in HTML format
 */
export const sendUserEmail = async (userEmail, subject, htmlContent) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log("Skipping User Email: SMTP_USER or SMTP_PASS not set in .env");
            return;
        }

        const mailOptions = {
            from: `"CareConnect" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: subject,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`User email sent: ${info.messageId}`);
    } catch (error) {
        console.error("Error sending user email:", error);
    }
};

/**
 * Send an email to the Centralized Hospital/Admin
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email body in HTML format
 */
export const sendHospitalEmail = async (subject, htmlContent) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log("Skipping Hospital Email: SMTP_USER or SMTP_PASS not set in .env");
            return;
        }

        // Send to centralized admin email (fallback to SMTP_USER if ADMIN_EMAIL is not set)
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

        const mailOptions = {
            from: `"CareConnect System" <${process.env.SMTP_USER}>`,
            to: adminEmail,
            subject: `[HOSPITAL ALERT] ${subject}`,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Hospital email sent: ${info.messageId}`);
    } catch (error) {
        console.error("Error sending hospital email:", error);
    }
};
