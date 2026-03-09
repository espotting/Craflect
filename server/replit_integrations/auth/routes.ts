import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { authStorage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendAdminVerificationCode } from "../../email";

const adminChallengeTokens = new Map<string, { email: string; expiresAt: number }>();

function createAdminChallengeToken(email: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  adminChallengeTokens.set(token, { email, expiresAt: Date.now() + 10 * 60 * 1000 });
  return token;
}

function validateAdminChallengeToken(token: string, email: string): boolean {
  const entry = adminChallengeTokens.get(token);
  if (!entry) return false;
  if (entry.email !== email || entry.expiresAt < Date.now()) {
    adminChallengeTokens.delete(token);
    return false;
  }
  return true;
}

function consumeAdminChallengeToken(token: string): void {
  adminChallengeTokens.delete(token);
}

function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "Password must contain at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least 1 special character"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      res.json(sanitizeUser(req.user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, firstName, lastName, password } = registerSchema.parse(req.body);

      const existing = await authStorage.getUserByEmail(email);
      if (existing?.emailVerified) {
        return res.status(400).json({ message: "An account with this email already exists. Please log in." });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      if (existing && !existing.emailVerified) {
        await authStorage.upsertUser({
          id: existing.id,
          email,
          firstName,
          lastName: lastName || null,
          password: hashedPassword,
          authProvider: "email",
          emailVerified: false,
        });
      } else {
        await authStorage.upsertUser({
          email,
          firstName,
          lastName: lastName || null,
          password: hashedPassword,
          authProvider: "email",
          emailVerified: false,
        });
      }

      const code = await authStorage.createVerificationCode(email);
      console.log(`[AUTH] Verification code for ${email}: ${code}`);

      res.json({ message: "Verification code sent", needsVerification: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/verify", async (req: any, res) => {
    try {
      const { email, code } = verifySchema.parse(req.body);

      const valid = await authStorage.verifyCode(email, code);
      if (!valid) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      let user = await authStorage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      await authStorage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: user.password,
        emailVerified: true,
        authProvider: "email",
      });

      user = (await authStorage.getUser(user.id))!;

      req.login(user, (err: any) => {
        if (err) {
          console.error("Login error after verification:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ message: "Email verified", user: sanitizeUser(user) });
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Verification error:", err);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await authStorage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "No account found with this email. Please sign up first." });
      }

      if (!user.password) {
        return res.status(400).json({ message: "This account uses Google sign-in. Please use 'Continue with Google'." });
      }

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return res.status(400).json({ message: "Incorrect password." });
      }

      if (!user.emailVerified) {
        const code = await authStorage.createVerificationCode(email);
        console.log(`[AUTH] Verification code for ${email}: ${code}`);
        return res.json({ message: "Email not verified. Verification code sent.", needsVerification: true });
      }

      if (user.isAdmin) {
        const code = await authStorage.createAdminVerificationCode(email);
        const challengeToken = createAdminChallengeToken(email);
        try {
          await sendAdminVerificationCode(code);
          console.log(`[AUTH] Admin verification code sent to security email`);
        } catch (emailErr) {
          console.error("[AUTH] Failed to send admin verification email:", emailErr);
        }
        return res.json({ message: "Admin verification required", needsAdminVerification: true, email, challengeToken });
      }

      req.login(user, (err: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ message: "Logged in", user: sanitizeUser(user) });
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/admin-verify", async (req: any, res) => {
    try {
      const input = z.object({
        email: z.string().email(),
        code: z.string().length(6),
        challengeToken: z.string().min(1),
      }).parse(req.body);

      if (!validateAdminChallengeToken(input.challengeToken, input.email)) {
        return res.status(403).json({ message: "Invalid or expired challenge. Please login again." });
      }

      const user = await authStorage.getUserByEmail(input.email);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const result = await authStorage.verifyAdminCode(input.email, input.code);

      if (result.tooManyAttempts) {
        consumeAdminChallengeToken(input.challengeToken);
        return res.status(429).json({ message: "Too many attempts. Please request a new code.", tooManyAttempts: true });
      }

      if (!result.valid) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      consumeAdminChallengeToken(input.challengeToken);

      req.login(user, (err: any) => {
        if (err) {
          console.error("Admin login error after verification:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ message: "Admin verified", user: sanitizeUser(user) });
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Admin verification error:", err);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/admin-resend", async (req, res) => {
    try {
      const input = z.object({
        email: z.string().email(),
        challengeToken: z.string().min(1),
      }).parse(req.body);

      if (!validateAdminChallengeToken(input.challengeToken, input.email)) {
        return res.status(403).json({ message: "Invalid or expired challenge. Please login again." });
      }

      const user = await authStorage.getUserByEmail(input.email);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const code = await authStorage.createAdminVerificationCode(input.email);
      try {
        await sendAdminVerificationCode(code);
        console.log(`[AUTH] Admin verification code resent to security email`);
      } catch (emailErr) {
        console.error("[AUTH] Failed to send admin verification email:", emailErr);
      }
      res.json({ message: "New admin code sent" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to resend code" });
    }
  });

  app.post("/api/auth/resend", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const code = await authStorage.createVerificationCode(email);
      console.log(`[AUTH] Resend verification code for ${email}: ${code}`);
      res.json({ message: "New code sent" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to resend code" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const input = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string()
          .min(8, "Password must be at least 8 characters")
          .regex(/[A-Z]/, "Must contain uppercase letter")
          .regex(/[0-9]/, "Must contain a number"),
      }).parse(req.body);

      const user = await authStorage.getUserById(req.user.id);
      if (!user || !user.password) {
        return res.status(400).json({ message: "Cannot change password for this account" });
      }

      const valid = await bcrypt.compare(input.currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashed = await bcrypt.hash(input.newPassword, 12);
      await authStorage.updateUserPassword(req.user.id, hashed);
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}
