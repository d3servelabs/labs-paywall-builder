import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

export const authTypeEnum = pgEnum("auth_type", [
  "none",
  "bearer",
  "api_key_header",
  "api_key_query",
  "basic_auth",
  "custom_headers",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "verified",
  "settled",
  "failed",
]);

// ============================================================================
// USERS TABLE (extended by better-auth)
// ============================================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 32 }).notNull().unique(),
    defaultPayTo: varchar("default_pay_to", { length: 42 }), // Ethereum address
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    uniqueIndex("users_slug_idx").on(table.slug),
  ]
);

// ============================================================================
// BETTER-AUTH MANAGED TABLES
// ============================================================================

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    uniqueIndex("sessions_token_idx").on(table.token),
  ]
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"), // Hashed password for email/password auth
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_account_idx").on(
      table.providerId,
      table.accountId
    ),
  ]
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)]
);

// ============================================================================
// ENDPOINTS TABLE
// ============================================================================

export const endpoints = pgTable(
  "endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    targetUrl: varchar("target_url", { length: 2048 }).notNull(),
    authType: authTypeEnum("auth_type").notNull().default("none"),
    authConfig: jsonb("auth_config").default({}).$type<AuthConfig>(),
    paywallAmount: decimal("paywall_amount", {
      precision: 18,
      scale: 6,
    }).notNull(),
    paywallPayTo: varchar("paywall_pay_to", { length: 42 }), // NULL = use user's default
    paywallTestnet: boolean("paywall_testnet").default(false).notNull(),
    paywallConfig: jsonb("paywall_config").default({}).$type<PaywallConfig>(),
    customHtml: text("custom_html"),
    cname: varchar("cname", { length: 253 }).unique(),
    cnameVerified: boolean("cname_verified").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    rateLimitPerSec: integer("rate_limit_per_sec").default(5).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("endpoints_user_slug_idx").on(table.userId, table.slug),
    index("endpoints_cname_idx").on(table.cname),
    index("endpoints_user_id_idx").on(table.userId),
  ]
);

// ============================================================================
// SECRETS TABLE
// ============================================================================

export const secrets = pgTable(
  "secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    iv: varchar("iv", { length: 32 }).notNull(), // Initialization vector for AES
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("secrets_user_name_idx").on(table.userId, table.name),
    index("secrets_user_id_idx").on(table.userId),
  ]
);

// ============================================================================
// PAYMENTS TABLE
// ============================================================================

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpointId: uuid("endpoint_id").references(() => endpoints.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    payerAddress: varchar("payer_address", { length: 42 }).notNull(),
    amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
    currency: varchar("currency", { length: 10 }).default("USDC").notNull(),
    chainId: integer("chain_id").notNull(),
    network: varchar("network", { length: 32 }).notNull(),
    txHash: varchar("tx_hash", { length: 66 }),
    status: paymentStatusEnum("status").notNull().default("pending"),
    paymentPayload: jsonb("payment_payload").notNull(),
    settlementResponse: jsonb("settlement_response"),
    requestPath: text("request_path"),
    requestMethod: varchar("request_method", { length: 10 }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    settledAt: timestamp("settled_at"),
  },
  (table) => [
    index("payments_endpoint_created_idx").on(table.endpointId, table.createdAt),
    index("payments_user_created_idx").on(table.userId, table.createdAt),
    index("payments_status_idx").on(table.status),
  ]
);

// ============================================================================
// REQUEST LOGS TABLE
// ============================================================================

export const requestLogs = pgTable(
  "request_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpointId: uuid("endpoint_id").references(() => endpoints.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    paymentId: uuid("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    requestPath: text("request_path").notNull(),
    requestMethod: varchar("request_method", { length: 10 }).notNull(),
    responseStatus: integer("response_status").notNull(),
    responseTimeMs: integer("response_time_ms"),
    clientIp: varchar("client_ip", { length: 45 }),
    userAgent: text("user_agent"),
    isBrowser: boolean("is_browser").default(false).notNull(),
    paid: boolean("paid").default(false).notNull(),
    rateLimited: boolean("rate_limited").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("request_logs_endpoint_created_idx").on(
      table.endpointId,
      table.createdAt
    ),
    index("request_logs_user_created_idx").on(table.userId, table.createdAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  endpoints: many(endpoints),
  secrets: many(secrets),
  payments: many(payments),
  requestLogs: many(requestLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const endpointsRelations = relations(endpoints, ({ one, many }) => ({
  user: one(users, {
    fields: [endpoints.userId],
    references: [users.id],
  }),
  payments: many(payments),
  requestLogs: many(requestLogs),
}));

export const secretsRelations = relations(secrets, ({ one }) => ({
  user: one(users, {
    fields: [secrets.userId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  endpoint: one(endpoints, {
    fields: [payments.endpointId],
    references: [endpoints.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const requestLogsRelations = relations(requestLogs, ({ one }) => ({
  endpoint: one(endpoints, {
    fields: [requestLogs.endpointId],
    references: [endpoints.id],
  }),
  user: one(users, {
    fields: [requestLogs.userId],
    references: [users.id],
  }),
  payment: one(payments, {
    fields: [requestLogs.paymentId],
    references: [payments.id],
  }),
}));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AuthType =
  | "none"
  | "bearer"
  | "api_key_header"
  | "api_key_query"
  | "basic_auth"
  | "custom_headers";

export type PaymentStatus = "pending" | "verified" | "settled" | "failed";

export interface AuthConfig {
  // For bearer
  token?: string;
  // For api_key_header
  headerName?: string;
  headerValue?: string;
  // For api_key_query
  queryParam?: string;
  queryValue?: string;
  // For basic_auth
  username?: string;
  password?: string;
  // For custom_headers
  headers?: Record<string, string>;
}

export interface PaywallConfig {
  theme?: string; // Theme preset name or custom theme
  branding?: {
    appName?: string;
    appLogo?: string;
  };
  resourceDescription?: string;
  successRedirectUrl?: string;
  successRedirectDelaySeconds?: number;
  autoSuccessRedirect?: boolean;
  successRedirectBtnLabel?: string;
  walletConnectProjectId?: string;
}

// Infer types from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Endpoint = typeof endpoints.$inferSelect;
export type NewEndpoint = typeof endpoints.$inferInsert;

export type Secret = typeof secrets.$inferSelect;
export type NewSecret = typeof secrets.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type RequestLog = typeof requestLogs.$inferSelect;
export type NewRequestLog = typeof requestLogs.$inferInsert;
