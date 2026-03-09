import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.craflect.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "admin@craflect.com",
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendAdminVerificationCode(code: string): Promise<void> {
  const targetEmail = process.env.ADMIN_VERIFICATION_EMAIL || "admin@craflect.com";

  await transporter.sendMail({
    from: `"Craflect Security" <${process.env.SMTP_USER || "admin@craflect.com"}>`,
    to: targetEmail,
    subject: `Craflect Admin Access — Code: ${code}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; color: #1a1a1a; margin: 0;">Craflect</h1>
          <p style="color: #666; font-size: 14px; margin-top: 4px;">Admin Verification</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center; border: 1px solid #e9ecef;">
          <p style="color: #333; font-size: 16px; margin: 0 0 16px;">Your verification code:</p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #7c3aed; margin: 16px 0; font-family: monospace;">${code}</div>
          <p style="color: #888; font-size: 13px; margin: 16px 0 0;">This code expires in 10 minutes.<br/>Maximum 5 attempts allowed.</p>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">If you did not request this code, please ignore this email.</p>
      </div>
    `,
  });

  console.log(`[EMAIL] Admin verification code sent to ${targetEmail}`);
}
