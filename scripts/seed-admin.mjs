/**
 * Seed the admin user into the Manus TiDB database (peppr_users table).
 * Also seeds the user's roles into peppr_user_roles.
 *
 * Usage: node scripts/seed-admin.mjs
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// Inline table definitions to avoid TypeScript import issues
import {
  boolean,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

const pepprUsers = mysqlTable("peppr_users", {
  userId: varchar("user_id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  mobile: varchar("mobile", { length: 20 }),
  role: varchar("role", { length: 50 }).default("USER").notNull(),
  positionId: varchar("position_id", { length: 100 }),
  partnerId: varchar("partner_id", { length: 36 }),
  propertyId: varchar("property_id", { length: 36 }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
  failedLoginAttempts: int("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: varchar("last_login_ip", { length: 45 }),
  requires2fa: boolean("requires_2fa").default(false).notNull(),
  twofaEnabled: boolean("twofa_enabled").default(false).notNull(),
  twofaSecret: text("twofa_secret"),
  twofaMethod: varchar("twofa_method", { length: 20 }),
  twofaBackupCodes: json("twofa_backup_codes"),
  ssoProvider: varchar("sso_provider", { length: 50 }),
  ssoProviderId: varchar("sso_provider_id", { length: 255 }),
  manusOpenId: varchar("manus_open_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

const pepprUserRoles = mysqlTable("peppr_user_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  roleId: varchar("role_id", { length: 100 }).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  grantedBy: varchar("granted_by", { length: 36 }),
});

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const db = drizzle(dbUrl);

  // Admin user details
  const adminEmail = "chawakit1444@gmail.com";
  const adminPassword = "db0014MR;;;;";
  const adminFullName = "Chawakit Admin";
  const ownerOpenId = process.env.OWNER_OPEN_ID || "";

  // Check if admin already exists
  const existing = await db
    .select()
    .from(pepprUsers)
    .where(eq(pepprUsers.email, adminEmail))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Admin user ${adminEmail} already exists (userId: ${existing[0].userId})`);
    // Update password hash and manusOpenId in case they changed
    const hash = await bcrypt.hash(adminPassword, 12);
    await db
      .update(pepprUsers)
      .set({
        passwordHash: hash,
        manusOpenId: ownerOpenId || existing[0].manusOpenId,
        ssoProviderId: ownerOpenId || existing[0].ssoProviderId,
      })
      .where(eq(pepprUsers.userId, existing[0].userId));
    console.log("Updated password hash and manusOpenId");
  } else {
    // Create admin user
    const userId = nanoid(12);
    const hash = await bcrypt.hash(adminPassword, 12);

    await db.insert(pepprUsers).values({
      userId,
      email: adminEmail,
      passwordHash: hash,
      fullName: adminFullName,
      role: "SUPER_ADMIN",
      emailVerified: true,
      status: "ACTIVE",
      manusOpenId: ownerOpenId || null,
      ssoProviderId: ownerOpenId || null,
      ssoProvider: ownerOpenId ? "manus" : null,
    });

    console.log(`Created admin user: ${adminEmail} (userId: ${userId})`);

    // Assign all admin roles
    const adminRoles = [
      "SUPER_ADMIN",
      "PARTNER_ADMIN",
      "PROPERTY_ADMIN",
      "FRONT_OFFICE",
      "HOUSEKEEPING",
      "MAINTENANCE",
      "REVENUE_MANAGER",
      "CHANNEL_MANAGER",
    ];

    for (const roleId of adminRoles) {
      await db.insert(pepprUserRoles).values({
        userId,
        roleId,
        grantedBy: userId,
      });
    }

    console.log(`Assigned ${adminRoles.length} roles to admin user`);
  }

  console.log("Seed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
