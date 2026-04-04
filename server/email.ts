import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.craflect.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "admin@craflect.com",
    pass: process.env.SMTP_PASSWORD,
  },
});

function getLogoAttachment() {
  const logoPath = path.resolve(process.cwd(), "client/src/assets/logo-color.png");
  if (fs.existsSync(logoPath)) {
    return {
      filename: "craflect-logo.png",
      path: logoPath,
      cid: "craflect-logo",
    };
  }
  return null;
}

function buildEmailHtml(options: { subtitle: string; code: string; expiryNote: string; footerText: string }) {
  const logoHtml = `<img src="cid:craflect-logo" alt="Craflect" style="height: 40px; width: auto;" />`;
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        ${logoHtml}
        <p style="color: #666; font-size: 14px; margin-top: 8px;">${options.subtitle}</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center; border: 1px solid #e9ecef;">
        <p style="color: #333; font-size: 16px; margin: 0 0 16px;">Your verification code:</p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #7c3aed; margin: 16px 0; font-family: monospace;">${options.code}</div>
        <p style="color: #888; font-size: 13px; margin: 16px 0 0;">${options.expiryNote}</p>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">${options.footerText}</p>
    </div>
  `;
}

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const logo = getLogoAttachment();
  await transporter.sendMail({
    from: `"Craflect" <${process.env.SMTP_USER || "admin@craflect.com"}>`,
    to: email,
    subject: `Your Craflect verification code: ${code}`,
    html: buildEmailHtml({
      subtitle: "Email Verification",
      code,
      expiryNote: "This code expires in 10 minutes.",
      footerText: "If you did not create an account on Craflect, please ignore this email.",
    }),
    ...(logo ? { attachments: [logo] } : {}),
  });

  console.log(`[EMAIL] Verification code sent to ${email}`);
}

export async function sendAdminVerificationCode(code: string): Promise<void> {
  const targetEmail = process.env.ADMIN_VERIFICATION_EMAIL || "admin@craflect.com";
  const logo = getLogoAttachment();

  await transporter.sendMail({
    from: `"Craflect Security" <${process.env.SMTP_USER || "admin@craflect.com"}>`,
    to: targetEmail,
    subject: `Craflect Admin Access — Code: ${code}`,
    html: buildEmailHtml({
      subtitle: "Admin Verification",
      code,
      expiryNote: "This code expires in 10 minutes.<br/>Maximum 5 attempts allowed.",
      footerText: "If you did not request this code, please ignore this email.",
    }),
    ...(logo ? { attachments: [logo] } : {}),
  });

  console.log(`[EMAIL] Admin verification code sent to ${targetEmail}`);
}

export async function sendWaitlistInvite(email: string, firstName: string, inviteToken: string): Promise<void> {
  const logo = getLogoAttachment();
  const signupUrl = `https://craflect.com/signup?invite=${inviteToken}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="cid:craflect-logo" alt="Craflect" style="height: 40px; width: auto;" />
        <p style="color: #666; font-size: 14px; margin-top: 8px;">You're invited</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center; border: 1px solid #e9ecef;">
        <p style="color: #333; font-size: 18px; font-weight: 600; margin: 0 0 12px;">Hey ${firstName},</p>
        <p style="color: #555; font-size: 15px; margin: 0 0 24px;">Your spot on Craflect is ready. Create your account now and start discovering what goes viral in your niche.</p>
        <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #d946ef); color: #fff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">Create My Account</a>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">This invite link is valid for 7 days.</p>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">If you did not sign up for the Craflect waitlist, please ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Craflect" <${process.env.SMTP_USER || "admin@craflect.com"}>`,
    to: email,
    subject: `${firstName}, your Craflect invite is here`,
    html,
    ...(logo ? { attachments: [logo] } : {}),
  });

  console.log(`[EMAIL] Waitlist invite sent to ${email}`);
}

export async function sendWaitlistConfirmation(email: string, firstName: string): Promise<void> {
  const logo = getLogoAttachment();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <img src="cid:craflect-logo" alt="Craflect" style="height: 40px; width: auto;" />
        <p style="color: #666; font-size: 14px; margin-top: 8px;">Waitlist Confirmation</p>
      </div>
      <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center; border: 1px solid #e9ecef;">
        <p style="color: #333; font-size: 18px; font-weight: 600; margin: 0 0 12px;">Welcome ${firstName},</p>
        <p style="color: #555; font-size: 15px; margin: 0 0 16px;">You're on the Craflect early access list. We'll review your application and send you an invitation when your spot is ready.</p>
        <p style="color: #7c3aed; font-size: 14px; font-weight: 500;">Keep creating.</p>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">If you did not sign up for the Craflect waitlist, please ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Craflect" <${process.env.SMTP_USER || "admin@craflect.com"}>`,
    to: email,
    subject: `You're on the list, ${firstName}`,
    html,
    ...(logo ? { attachments: [logo] } : {}),
  });

  console.log(`[EMAIL] Waitlist confirmation sent to ${email}`);
}
