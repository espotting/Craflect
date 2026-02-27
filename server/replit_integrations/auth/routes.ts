import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { authStorage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";

function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
}
