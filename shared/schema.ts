import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users ──────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("free").notNull(),
  planType: text("plan_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, passwordHash: true, googleId: true })
  .extend({ password: z.string().min(8, "Password must be at least 8 characters") });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type SafeUser = Omit<User, "passwordHash">;

// ── User Profiles ──────────────────────────────────────────────
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  businessType: text("business_type"),
  province: text("province").default("ON"),
  incomeRange: text("income_range"),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;

// ── Scenarios (legacy — kept for existing data) ────────────────
export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  corporateRevenue: integer("corporate_revenue").default(0).notNull(),
  corporateExpenses: integer("corporate_expenses").default(0).notNull(),
  salaryAmount: integer("salary_amount").default(0).notNull(),
  dividendAmount: integer("dividend_amount").default(0).notNull(),
  province: text("province").default("ON").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type UpdateScenarioRequest = Partial<InsertScenario>;

// ── Net Worth Statements ───────────────────────────────────────
export const netWorthStatements = pgTable("net_worth_statements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").default("My Net Worth").notNull(),
  totalAssets: integer("total_assets").default(0).notNull(),
  totalLiabilities: integer("total_liabilities").default(0).notNull(),
  netWorth: integer("net_worth").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNetWorthStatementSchema = createInsertSchema(netWorthStatements).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type NetWorthStatement = typeof netWorthStatements.$inferSelect;
export type InsertNetWorthStatement = z.infer<typeof insertNetWorthStatementSchema>;

// ── Net Worth Items ────────────────────────────────────────────
export const netWorthItems = pgTable("net_worth_items", {
  id: serial("id").primaryKey(),
  statementId: integer("statement_id").references(() => netWorthStatements.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  documentId: integer("document_id").references(() => uploadedDocuments.id, { onDelete: "set null" }),
  sourceType: text("source_type").default("manual").notNull(),
  investorName: text("investor_name"),
  familyName: text("family_name"),
  institutionName: text("institution_name"),
  type: text("type").notNull(),      // "asset" | "liability"
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  name: text("name").notNull(),
  amount: integer("amount").default(0).notNull(),
  priorValue: integer("prior_value").default(0).notNull(),
  changeAmount: integer("change_amount").default(0).notNull(),
  reportingPeriod: text("reporting_period"),
  confidenceScore: integer("confidence_score").default(100).notNull(),
  verified: boolean("verified").default(false).notNull(),
  sourceTextSnippet: text("source_text_snippet"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNetWorthItemSchema = createInsertSchema(netWorthItems).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type NetWorthItem = typeof netWorthItems.$inferSelect;
export type InsertNetWorthItem = z.infer<typeof insertNetWorthItemSchema>;

// Investor profiles are lightweight labels for grouping net worth statements.
export const investorProfiles = pgTable("investor_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  investorName: text("investor_name").notNull(),
  familyName: text("family_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInvestorProfileSchema = createInsertSchema(investorProfiles).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InvestorProfile = typeof investorProfiles.$inferSelect;
export type InsertInvestorProfile = z.infer<typeof insertInvestorProfileSchema>;

// ── Income Strategies (saved) ──────────────────────────────────
export const incomeStrategies = pgTable("income_strategies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  province: text("province").default("ON").notNull(),
  corporateProfit: integer("corporate_profit").default(0).notNull(),
  desiredCashWithdrawal: integer("desired_cash_withdrawal").default(0).notNull(),
  gripBalance: integer("grip_balance"),
  wantsCppRrsp: text("wants_cpp_rrsp"),
  preferSimple: boolean("prefer_simple").default(false),
  salaryRecommendation: integer("salary_recommendation"),
  dividendRecommendation: integer("dividend_recommendation"),
  blendedNote: text("blended_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIncomeStrategySchema = createInsertSchema(incomeStrategies).omit({
  id: true, createdAt: true,
});
export type IncomeStrategy = typeof incomeStrategies.$inferSelect;
export type InsertIncomeStrategy = z.infer<typeof insertIncomeStrategySchema>;

// ── Uploaded Documents ─────────────────────────────────────────
export const uploadedDocuments = pgTable("uploaded_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  originalName: text("original_name").notNull(),
  storedPath: text("stored_path"),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  status: text("status").default("uploaded").notNull(),
  documentType: text("document_type"),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUploadedDocumentSchema = createInsertSchema(uploadedDocuments).omit({
  id: true, createdAt: true,
});
export type UploadedDocument = typeof uploadedDocuments.$inferSelect;
export type InsertUploadedDocument = z.infer<typeof insertUploadedDocumentSchema>;

// ── Reports ────────────────────────────────────────────────────
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  reportType: text("report_type").notNull(),  // "net_worth" | "income_strategy"
  title: text("title").notNull(),
  referenceId: integer("reference_id"),
  status: text("status").default("generated").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true, createdAt: true,
});
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export const reportSnapshots = pgTable("report_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  statementId: integer("statement_id").references(() => netWorthStatements.id, { onDelete: "cascade" }).notNull(),
  reportType: text("report_type").default("net_worth").notNull(),
  title: text("title").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportSnapshotSchema = createInsertSchema(reportSnapshots).omit({
  id: true, createdAt: true,
});
export type ReportSnapshot = typeof reportSnapshots.$inferSelect;
export type InsertReportSnapshot = z.infer<typeof insertReportSnapshotSchema>;

// ── Waitlist ───────────────────────────────────────────────────
export const waitlistEmails = pgTable("waitlist_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").default("landing").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWaitlistSchema = createInsertSchema(waitlistEmails).omit({
  id: true, createdAt: true,
});
export type WaitlistEmail = typeof waitlistEmails.$inferSelect;

// ── AI Extractions ─────────────────────────────────────────────
// Append-only log of every raw OpenAI response.
// Never modified after insert — user edits only touch net_worth_items.
export const aiExtractions = pgTable("ai_extractions", {
  id:           serial("id").primaryKey(),
  documentId:   integer("document_id").references(() => uploadedDocuments.id, { onDelete: "cascade" }).notNull(),
  userId:       integer("user_id").references(() => users.id).notNull(),
  model:        text("model").notNull(),
  rawResponse:  text("raw_response").notNull(),   // verbatim JSON string from OpenAI
  itemCount:    integer("item_count").default(0).notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
});

export const insertAiExtractionSchema = createInsertSchema(aiExtractions).omit({
  id: true, createdAt: true,
});
export type AiExtraction = typeof aiExtractions.$inferSelect;
export type InsertAiExtraction = z.infer<typeof insertAiExtractionSchema>;

// ── Annotations ────────────────────────────────────────────────
// Append-only record of every user correction made during import review.
// Enables model training, accuracy tracking, and audit trails.
export const annotations = pgTable("annotations", {
  id:             serial("id").primaryKey(),
  userId:         integer("user_id").references(() => users.id).notNull(),
  documentId:     integer("document_id").references(() => uploadedDocuments.id, { onDelete: "cascade" }),
  tempId:         text("temp_id"),               // ParsedItem.tempId — links to the specific item
  fieldName:      text("field_name").notNull(),   // "name" | "category" | "type" | "amount" | "notes"
  originalValue:  text("original_value"),         // value as extracted from the document
  correctedValue: text("corrected_value"),         // value after user edit
  annotationType: text("annotation_type").notNull(), // "name_correction" | "category_correction" | "type_correction" | "amount_correction" | "notes_added" | "flag_cleared"
  notes:          text("notes"),                  // optional extra context
  createdAt:      timestamp("created_at").defaultNow().notNull(),
});

export const insertAnnotationSchema = createInsertSchema(annotations).omit({
  id: true, createdAt: true,
});
export type Annotation = typeof annotations.$inferSelect;
export type InsertAnnotation = z.infer<typeof insertAnnotationSchema>;

// ── Analytics Events ───────────────────────────────────────────
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  eventName: text("event_name").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
