import { db } from "../db";
import {
  users, userProfiles, scenarios, waitlistEmails, analyticsEvents,
  netWorthStatements, netWorthItems, incomeStrategies, uploadedDocuments, reports,
  aiExtractions, annotations, investorProfiles, reportSnapshots,
  type InsertScenario, type UpdateScenarioRequest, type Scenario,
  type User, type UserProfile, type WaitlistEmail,
  type NetWorthStatement, type InsertNetWorthStatement,
  type NetWorthItem, type InsertNetWorthItem,
  type InvestorProfile, type InsertInvestorProfile,
  type IncomeStrategy, type InsertIncomeStrategy,
  type UploadedDocument, type InsertUploadedDocument,
  type Report, type InsertReport,
  type ReportSnapshot, type InsertReportSnapshot,
  type AiExtraction, type InsertAiExtraction,
  type Annotation, type InsertAnnotation,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { hashPassword } from "../auth/crypto";

export interface IStorage {
  // Users
  createUser(email: string, password: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  findOrCreateGoogleUser(googleId: string, email: string): Promise<User>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: number, data: { stripeCustomerId?: string; stripeSubscriptionId?: string | null; subscriptionStatus?: string; planType?: string | null }): Promise<User>;

  changePassword(userId: number, newHash: string): Promise<void>;

  // Profiles
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  upsertUserProfile(userId: number, data: { firstName?: string; lastName?: string; businessType?: string; province?: string; incomeRange?: string; onboardingCompleted?: boolean }): Promise<UserProfile>;

  // Scenarios (legacy)
  getScenariosByUser(userId: number): Promise<Scenario[]>;
  getScenario(id: number): Promise<Scenario | undefined>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;
  updateScenario(id: number, updates: UpdateScenarioRequest): Promise<Scenario>;
  deleteScenario(id: number): Promise<void>;
  countUserScenarios(userId: number): Promise<number>;

  // Net Worth
  getOrCreateNetWorthStatement(userId: number): Promise<NetWorthStatement>;
  getNetWorthItems(statementId: number): Promise<NetWorthItem[]>;
  addNetWorthItem(data: InsertNetWorthItem): Promise<NetWorthItem>;
  replaceNetWorthItems(statementId: number, userId: number, items: InsertNetWorthItem[]): Promise<NetWorthItem[]>;
  /** Returns null if item not found or does not belong to userId. */
  updateNetWorthItem(id: number, userId: number, updates: Partial<InsertNetWorthItem>): Promise<NetWorthItem | null>;
  deleteNetWorthItem(id: number, userId: number): Promise<void>;
  updateNetWorthTotals(statementId: number, totalAssets: number, totalLiabilities: number): Promise<NetWorthStatement>;
  upsertInvestorProfiles(userId: number, profiles: InsertInvestorProfile[]): Promise<InvestorProfile[]>;

  // Income Strategies
  getIncomeStrategies(userId: number): Promise<IncomeStrategy[]>;
  saveIncomeStrategy(data: InsertIncomeStrategy): Promise<IncomeStrategy>;
  deleteIncomeStrategy(id: number, userId: number): Promise<void>;

  // Uploaded Documents
  createUploadedDocument(data: InsertUploadedDocument): Promise<UploadedDocument>;
  getUploadedDocuments(userId: number): Promise<UploadedDocument[]>;
  getUploadedDocument(id: number, userId: number): Promise<UploadedDocument | undefined>;
  deleteUploadedDocument(id: number, userId: number): Promise<void>;
  updateUploadedDocumentStatus(id: number, status: string): Promise<UploadedDocument>;

  // AI Extractions (append-only — never update after insert)
  createAiExtraction(data: InsertAiExtraction): Promise<AiExtraction>;
  getAiExtractionsByDocument(documentId: number): Promise<AiExtraction[]>;

  // Reports
  getReports(userId: number): Promise<Report[]>;
  getReport(id: number, userId: number): Promise<Report | undefined>;
  createReport(data: InsertReport): Promise<Report>;
  createReportSnapshot(data: InsertReportSnapshot): Promise<ReportSnapshot>;
  deleteReport(id: number, userId: number): Promise<void>;
  getIncomeStrategyById(id: number): Promise<IncomeStrategy | undefined>;

  // Waitlist
  addToWaitlist(email: string, source: string): Promise<WaitlistEmail | null>;

  // Annotations (user corrections during import review)
  createAnnotation(data: InsertAnnotation): Promise<Annotation>;
  getAnnotationsByDocument(documentId: number, userId: number): Promise<Annotation[]>;

  // Health check
  checkDatabaseHealth(): Promise<{ connected: boolean; tablesExist: boolean }>;

  // Analytics
  trackEvent(eventName: string, userId?: number, metadata?: string): Promise<void>;

  // Account deletion
  deleteUser(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ── Users ──────────────────────────────────────────────
  async createUser(email: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email: email.toLowerCase().trim(), passwordHash })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async changePassword(userId: number, newHash: string): Promise<void> {
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
  }

  async updateUserStripeInfo(
    userId: number,
    data: { stripeCustomerId?: string; stripeSubscriptionId?: string | null; subscriptionStatus?: string; planType?: string | null }
  ): Promise<User> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async findOrCreateGoogleUser(googleId: string, email: string): Promise<User> {
    const [byGoogle] = await db.select().from(users).where(eq(users.googleId, googleId));
    if (byGoogle) return byGoogle;

    const [byEmail] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
    if (byEmail) {
      const [linked] = await db.update(users).set({ googleId }).where(eq(users.id, byEmail.id)).returning();
      return linked;
    }

    const [newUser] = await db
      .insert(users)
      .values({ email: email.toLowerCase().trim(), googleId })
      .returning();
    await db.insert(userProfiles).values({ userId: newUser.id, onboardingCompleted: false });
    return newUser;
  }

  // ── Profiles ────────────────────────────────────────────
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUserProfile(
    userId: number,
    data: { firstName?: string; lastName?: string; businessType?: string; province?: string; incomeRange?: string; onboardingCompleted?: boolean }
  ): Promise<UserProfile> {
    const existing = await this.getUserProfile(userId);
    if (existing) {
      const [updated] = await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId)).returning();
      return updated;
    } else {
      const [created] = await db.insert(userProfiles).values({ userId, ...data }).returning();
      return created;
    }
  }

  // ── Scenarios (legacy) ───────────────────────────────────
  async getScenariosByUser(userId: number): Promise<Scenario[]> {
    return db.select().from(scenarios).where(eq(scenarios.userId, userId)).orderBy(desc(scenarios.createdAt));
  }

  async getScenario(id: number): Promise<Scenario | undefined> {
    const [s] = await db.select().from(scenarios).where(eq(scenarios.id, id));
    return s;
  }

  async createScenario(scenario: InsertScenario): Promise<Scenario> {
    const [s] = await db.insert(scenarios).values(scenario).returning();
    return s;
  }

  async updateScenario(id: number, updates: UpdateScenarioRequest): Promise<Scenario> {
    const [s] = await db.update(scenarios).set({ ...updates, updatedAt: new Date() }).where(eq(scenarios.id, id)).returning();
    return s;
  }

  async deleteScenario(id: number): Promise<void> {
    await db.delete(scenarios).where(eq(scenarios.id, id));
  }

  async countUserScenarios(userId: number): Promise<number> {
    const rows = await db.select().from(scenarios).where(eq(scenarios.userId, userId));
    return rows.length;
  }

  // ── Net Worth ────────────────────────────────────────────
  async getOrCreateNetWorthStatement(userId: number): Promise<NetWorthStatement> {
    const [existing] = await db
      .select()
      .from(netWorthStatements)
      .where(eq(netWorthStatements.userId, userId))
      .orderBy(desc(netWorthStatements.createdAt))
      .limit(1);
    if (existing) return existing;

    const [created] = await db
      .insert(netWorthStatements)
      .values({ userId, title: "My Net Worth" })
      .returning();
    return created;
  }

  async getNetWorthItems(statementId: number): Promise<NetWorthItem[]> {
    return db
      .select()
      .from(netWorthItems)
      .where(eq(netWorthItems.statementId, statementId))
      .orderBy(netWorthItems.createdAt);
  }

  async addNetWorthItem(data: InsertNetWorthItem): Promise<NetWorthItem> {
    const [item] = await db.insert(netWorthItems).values(data).returning();
    return item;
  }

  async replaceNetWorthItems(statementId: number, userId: number, items: InsertNetWorthItem[]): Promise<NetWorthItem[]> {
    await db.delete(netWorthItems)
      .where(and(eq(netWorthItems.statementId, statementId), eq(netWorthItems.userId, userId)));
    if (items.length === 0) return [];
    return db.insert(netWorthItems).values(items).returning();
  }

  async updateNetWorthItem(id: number, userId: number, updates: Partial<InsertNetWorthItem>): Promise<NetWorthItem | null> {
    // Strip userId from updates — ownership is enforced via WHERE clause, not overwritten
    const { userId: _uid, ...safeUpdates } = updates as any;
    const [item] = await db
      .update(netWorthItems)
      .set({ ...safeUpdates, updatedAt: new Date() })
      .where(and(eq(netWorthItems.id, id), eq(netWorthItems.userId, userId)))
      .returning();
    return item ?? null;
  }

  async deleteNetWorthItem(id: number, userId: number): Promise<void> {
    await db.delete(netWorthItems)
      .where(and(eq(netWorthItems.id, id), eq(netWorthItems.userId, userId)));
  }

  async updateNetWorthTotals(
    statementId: number,
    totalAssets: number,
    totalLiabilities: number
  ): Promise<NetWorthStatement> {
    const [s] = await db
      .update(netWorthStatements)
      .set({ totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities, updatedAt: new Date() })
      .where(eq(netWorthStatements.id, statementId))
      .returning();
    return s;
  }

  async upsertInvestorProfiles(userId: number, profiles: InsertInvestorProfile[]): Promise<InvestorProfile[]> {
    const names = new Map<string, InsertInvestorProfile>();
    for (const profile of profiles) {
      const key = `${profile.investorName.trim().toLowerCase()}::${profile.familyName ?? ""}`;
      if (profile.investorName.trim()) names.set(key, profile);
    }
    const created: InvestorProfile[] = [];
    for (const profile of names.values()) {
      const [existing] = await db
        .select()
        .from(investorProfiles)
        .where(and(
          eq(investorProfiles.userId, userId),
          eq(investorProfiles.investorName, profile.investorName),
        ))
        .limit(1);
      if (existing) {
        const [updated] = await db.update(investorProfiles)
          .set({ familyName: profile.familyName ?? existing.familyName, updatedAt: new Date() })
          .where(eq(investorProfiles.id, existing.id))
          .returning();
        created.push(updated);
      } else {
        const [row] = await db.insert(investorProfiles).values(profile).returning();
        created.push(row);
      }
    }
    return created;
  }

  // ── Income Strategies ────────────────────────────────────
  async getIncomeStrategies(userId: number): Promise<IncomeStrategy[]> {
    return db.select().from(incomeStrategies).where(eq(incomeStrategies.userId, userId)).orderBy(desc(incomeStrategies.createdAt));
  }

  async saveIncomeStrategy(data: InsertIncomeStrategy): Promise<IncomeStrategy> {
    const [s] = await db.insert(incomeStrategies).values(data).returning();
    return s;
  }

  async deleteIncomeStrategy(id: number, userId: number): Promise<void> {
    await db.delete(incomeStrategies)
      .where(and(eq(incomeStrategies.id, id), eq(incomeStrategies.userId, userId)));
  }

  // ── Uploaded Documents ───────────────────────────────────
  async createUploadedDocument(data: InsertUploadedDocument): Promise<UploadedDocument> {
    const [doc] = await db.insert(uploadedDocuments).values(data).returning();
    return doc;
  }

  async getUploadedDocuments(userId: number): Promise<UploadedDocument[]> {
    return db
      .select()
      .from(uploadedDocuments)
      .where(eq(uploadedDocuments.userId, userId))
      .orderBy(desc(uploadedDocuments.createdAt));
  }

  async getUploadedDocument(id: number, userId: number): Promise<UploadedDocument | undefined> {
    const [doc] = await db
      .select()
      .from(uploadedDocuments)
      .where(and(eq(uploadedDocuments.id, id), eq(uploadedDocuments.userId, userId)));
    return doc;
  }

  async deleteUploadedDocument(id: number, userId: number): Promise<void> {
    await db
      .delete(uploadedDocuments)
      .where(and(eq(uploadedDocuments.id, id), eq(uploadedDocuments.userId, userId)));
  }

  async updateUploadedDocumentStatus(id: number, status: string): Promise<UploadedDocument> {
    const [doc] = await db
      .update(uploadedDocuments)
      .set({ status })
      .where(eq(uploadedDocuments.id, id))
      .returning();
    return doc;
  }

  // ── AI Extractions (append-only) ─────────────────────────
  async createAiExtraction(data: InsertAiExtraction): Promise<AiExtraction> {
    const [row] = await db.insert(aiExtractions).values(data).returning();
    return row;
  }

  async getAiExtractionsByDocument(documentId: number): Promise<AiExtraction[]> {
    return db
      .select()
      .from(aiExtractions)
      .where(eq(aiExtractions.documentId, documentId))
      .orderBy(desc(aiExtractions.createdAt));
  }

  // ── Reports ──────────────────────────────────────────────
  async getReports(userId: number): Promise<Report[]> {
    return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
  }

  async getReport(id: number, userId: number): Promise<Report | undefined> {
    const [r] = await db.select().from(reports).where(eq(reports.id, id));
    if (!r || r.userId !== userId) return undefined;
    return r;
  }

  async createReport(data: InsertReport): Promise<Report> {
    const [r] = await db.insert(reports).values(data).returning();
    return r;
  }

  async createReportSnapshot(data: InsertReportSnapshot): Promise<ReportSnapshot> {
    const [snapshot] = await db.insert(reportSnapshots).values(data).returning();
    return snapshot;
  }

  async deleteReport(id: number, userId: number): Promise<void> {
    await db.delete(reports)
      .where(and(eq(reports.id, id), eq(reports.userId, userId)));
  }

  async getIncomeStrategyById(id: number): Promise<IncomeStrategy | undefined> {
    const [s] = await db.select().from(incomeStrategies).where(eq(incomeStrategies.id, id));
    return s;
  }

  // ── Waitlist ─────────────────────────────────────────────
  async addToWaitlist(email: string, source: string): Promise<WaitlistEmail | null> {
    try {
      const [row] = await db.insert(waitlistEmails).values({ email: email.toLowerCase().trim(), source }).returning();
      return row;
    } catch { return null; }
  }

  // ── Annotations ──────────────────────────────────────────
  async createAnnotation(data: InsertAnnotation): Promise<Annotation> {
    const [row] = await db.insert(annotations).values(data).returning();
    return row;
  }

  async getAnnotationsByDocument(documentId: number, userId: number): Promise<Annotation[]> {
    return db
      .select()
      .from(annotations)
      .where(and(eq(annotations.documentId, documentId), eq(annotations.userId, userId)))
      .orderBy(desc(annotations.createdAt));
  }

  // ── Health check ──────────────────────────────────────────
  async checkDatabaseHealth(): Promise<{ connected: boolean; tablesExist: boolean }> {
    try {
      await db.select().from(users).limit(1);
      return { connected: true, tablesExist: true };
    } catch {
      return { connected: false, tablesExist: false };
    }
  }

  // ── Analytics ────────────────────────────────────────────
  async trackEvent(eventName: string, userId?: number, metadata?: string): Promise<void> {
    await db.insert(analyticsEvents).values({ eventName, userId: userId ?? null, metadata: metadata ?? null });
  }

  // ── Account deletion ──────────────────────────────────────
  async deleteUser(userId: number): Promise<void> {
    // Delete in FK-safe order. aiExtractions + annotations cascade from uploadedDocuments.
    await db.delete(analyticsEvents).where(eq(analyticsEvents.userId, userId));
    await db.delete(reports).where(eq(reports.userId, userId));
    await db.delete(reportSnapshots).where(eq(reportSnapshots.userId, userId));
    await db.delete(investorProfiles).where(eq(investorProfiles.userId, userId));
    await db.delete(annotations).where(eq(annotations.userId, userId));
    await db.delete(aiExtractions).where(eq(aiExtractions.userId, userId));
    await db.delete(uploadedDocuments).where(eq(uploadedDocuments.userId, userId));
    await db.delete(netWorthItems).where(eq(netWorthItems.userId, userId));
    await db.delete(netWorthStatements).where(eq(netWorthStatements.userId, userId));
    await db.delete(incomeStrategies).where(eq(incomeStrategies.userId, userId));
    await db.delete(scenarios).where(eq(scenarios.userId, userId));
    await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
