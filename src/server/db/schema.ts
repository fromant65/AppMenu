import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  json,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

import { type PriceAnnotation } from "~/types/menu";

export const createTable = pgTableCreator((name) => `app_menu_${name}`);

// =============================================================================
// USERS
// =============================================================================

export const users = createTable("user", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  emailVerified: timestamp("email_verified", {
    mode: "date",
    withTimezone: true,
  }),
  image: varchar("image", { length: 255 }),
  businessName: varchar("business_name", { length: 255 }),
  businessSlug: varchar("business_slug", { length: 100 }).unique(),
  subscriptionStatus: varchar("subscription_status", { length: 50 })
    .notNull()
    .default("trial"),
  subscriptionExpiry: timestamp("subscription_expiry", { withTimezone: true }),
  mpCustomerId: varchar("mp_customer_id", { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  menus: many(menus),
  payments: many(payments),
}));

// =============================================================================
// NEXTAUTH
// =============================================================================

export const accounts = createTable(
  "account",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  {
    sessionToken: varchar("session_token", { length: 255 }).notNull().primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// =============================================================================
// MENUS
// =============================================================================

export const menus = createTable(
  "menu",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (t) => [
    index("menu_user_id_idx").on(t.userId),
    index("menu_slug_idx").on(t.slug),
  ],
);

export const menusRelations = relations(menus, ({ one, many }) => ({
  user: one(users, { fields: [menus.userId], references: [users.id] }),
  pages: many(menuPages),
}));

// =============================================================================
// MENU PAGES
// =============================================================================

export const menuPages = createTable(
  "menu_page",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    menuId: integer("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    imageUrl: varchar("image_url", { length: 1024 }).notNull(),
    annotations: json("annotations")
      .$type<PriceAnnotation[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [index("page_menu_id_idx").on(t.menuId)],
);

export const menuPagesRelations = relations(menuPages, ({ one }) => ({
  menu: one(menus, { fields: [menuPages.menuId], references: [menus.id] }),
}));

// =============================================================================
// PAYMENTS
// =============================================================================

export const payments = createTable(
  "payment",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    mpPaymentId: varchar("mp_payment_id", { length: 255 }),
    mpSubscriptionId: varchar("mp_subscription_id", { length: 255 }),
    amount: integer("amount"),
    currency: varchar("currency", { length: 10 }).default("ARS"),
    status: varchar("status", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => [index("payment_user_id_idx").on(t.userId)],
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));
