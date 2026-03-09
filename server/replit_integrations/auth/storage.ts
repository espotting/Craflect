import { users, verificationCodes, adminVerificationCodes, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq, and, gt, lt } from "drizzle-orm";

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createVerificationCode(email: string): Promise<string>;
  verifyCode(email: string, code: string): Promise<boolean>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  createAdminVerificationCode(email: string): Promise<string>;
  verifyAdminCode(email: string, code: string): Promise<{ valid: boolean; tooManyAttempts: boolean }>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createVerificationCode(email: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.insert(verificationCodes).values({
      email,
      code,
      expiresAt,
    });

    return code;
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const [record] = await db
      .select()
      .from(verificationCodes)
      .where(
        and(
          eq(verificationCodes.email, email),
          eq(verificationCodes.code, code),
          eq(verificationCodes.used, false),
          gt(verificationCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!record) return false;

    await db
      .update(verificationCodes)
      .set({ used: true })
      .where(eq(verificationCodes.id, record.id));

    return true;
  }
  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }

  async createAdminVerificationCode(email: string): Promise<string> {
    const crypto = await import("crypto");

    await db.update(adminVerificationCodes)
      .set({ used: true })
      .where(
        and(
          eq(adminVerificationCodes.email, email),
          eq(adminVerificationCodes.used, false)
        )
      );

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(adminVerificationCodes).values({
      email,
      code,
      expiresAt,
    });

    return code;
  }

  async verifyAdminCode(email: string, code: string): Promise<{ valid: boolean; tooManyAttempts: boolean }> {
    const [record] = await db
      .select()
      .from(adminVerificationCodes)
      .where(
        and(
          eq(adminVerificationCodes.email, email),
          eq(adminVerificationCodes.used, false),
          gt(adminVerificationCodes.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!record) return { valid: false, tooManyAttempts: false };

    const currentAttempts = (record.attemptCount || 0) + 1;

    if (currentAttempts > 5) {
      await db.update(adminVerificationCodes)
        .set({ used: true })
        .where(eq(adminVerificationCodes.id, record.id));
      return { valid: false, tooManyAttempts: true };
    }

    if (record.code !== code) {
      await db.update(adminVerificationCodes)
        .set({ attemptCount: currentAttempts })
        .where(eq(adminVerificationCodes.id, record.id));
      return { valid: false, tooManyAttempts: currentAttempts >= 5 };
    }

    await db.update(adminVerificationCodes)
      .set({ used: true })
      .where(eq(adminVerificationCodes.id, record.id));

    return { valid: true, tooManyAttempts: false };
  }
}

export const authStorage = new AuthStorage();
