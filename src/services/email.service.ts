import nodemailer from "nodemailer";
import { env } from "../config/env.js";

type SendOtpParams = {
  to: string;
  subject: string;
  purpose: "register" | "password_reset";
  otp: string;
};

export async function sendOtpEmail({ to, subject, purpose, otp }: SendOtpParams) {
  if (env.DEV_OTP_ENABLED) {
    console.log(`[DEV OTP] ${purpose} ${to} → ${otp}`);
    return;
  }

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.warn("[email] SMTP not configured — OTP not sent:", to);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>${subject}</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16a34a;">${otp}</p>
        <p style="color: #64748b; font-size: 14px;">This code expires in ${env.OTP_TTL_MINUTES} minutes.</p>
      </div>
    `,
  });
}
