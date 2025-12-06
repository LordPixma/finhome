import { eq, and, lte, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { scheduledReports, scheduledReportRuns } from '../db/schema';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '../db/schema';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export type ReportType = 'transactions' | 'budgets' | 'goals' | 'analytics' | 'all';
export type ScheduledReportFormat = 'csv' | 'json';
export type RunStatus = 'pending' | 'generating' | 'sending' | 'completed' | 'failed';

export interface CreateScheduledReportInput {
  name: string;
  reportType: ReportType;
  format: ScheduledReportFormat;
  frequency: ReportFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay?: string;
  timezone?: string;
  includeAllTime?: boolean;
  lookbackDays?: number;
  deliveryEmail: string;
}

export interface UpdateScheduledReportInput {
  name?: string;
  reportType?: ReportType;
  format?: ScheduledReportFormat;
  frequency?: ReportFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay?: string;
  timezone?: string;
  includeAllTime?: boolean;
  lookbackDays?: number;
  deliveryEmail?: string;
  isEnabled?: boolean;
}

type DbType = DrizzleD1Database<typeof schema>;

export class ScheduledReportsService {
  constructor(private db: DbType) {}

  /**
   * Calculate the next run time for a scheduled report
   */
  private calculateNextRunTime(
    frequency: ReportFrequency,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null,
    timeOfDay: string = '09:00'
  ): Date {
    const now = new Date();
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    const nextRun = new Date(now);

    // Set the time
    nextRun.setHours(hours, minutes, 0, 0);

    switch (frequency) {
      case 'daily':
        // If the time has passed today, schedule for tomorrow
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case 'weekly':
        const targetDay = dayOfWeek ?? 1; // Default to Monday
        const currentDay = nextRun.getDay();
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= now)) {
          daysUntilTarget += 7;
        }
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        break;

      case 'monthly':
        const targetDate = dayOfMonth ?? 1; // Default to 1st of month
        nextRun.setDate(targetDate);
        // If the date has passed this month, schedule for next month
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        // Handle months with fewer days
        const daysInMonth = new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0).getDate();
        if (targetDate > daysInMonth) {
          nextRun.setDate(daysInMonth);
        }
        break;
    }

    return nextRun;
  }

  /**
   * Create a new scheduled report
   */
  async createScheduledReport(
    tenantId: string,
    userId: string,
    input: CreateScheduledReportInput
  ) {
    const id = nanoid();
    const now = new Date();
    const nextRunAt = this.calculateNextRunTime(
      input.frequency,
      input.dayOfWeek,
      input.dayOfMonth,
      input.timeOfDay
    );

    const format = input.format as 'csv' | 'json';

    await this.db.insert(scheduledReports).values({
      id,
      tenantId,
      userId,
      name: input.name,
      reportType: input.reportType,
      format,
      frequency: input.frequency,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      timeOfDay: input.timeOfDay || '09:00',
      timezone: input.timezone || 'Europe/London',
      includeAllTime: input.includeAllTime || false,
      lookbackDays: input.lookbackDays || 30,
      deliveryEmail: input.deliveryEmail,
      isEnabled: true,
      nextRunAt,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    }).run();

    return this.getScheduledReport(tenantId, id);
  }

  /**
   * Get a scheduled report by ID
   */
  async getScheduledReport(tenantId: string, reportId: string) {
    return this.db
      .select()
      .from(scheduledReports)
      .where(and(
        eq(scheduledReports.id, reportId),
        eq(scheduledReports.tenantId, tenantId)
      ))
      .get();
  }

  /**
   * Get all scheduled reports for a tenant
   */
  async getScheduledReports(tenantId: string) {
    return this.db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.tenantId, tenantId))
      .orderBy(desc(scheduledReports.createdAt))
      .all();
  }

  /**
   * Get all scheduled reports for a user
   */
  async getUserScheduledReports(tenantId: string, userId: string) {
    return this.db
      .select()
      .from(scheduledReports)
      .where(and(
        eq(scheduledReports.tenantId, tenantId),
        eq(scheduledReports.userId, userId)
      ))
      .orderBy(desc(scheduledReports.createdAt))
      .all();
  }

  /**
   * Update a scheduled report
   */
  async updateScheduledReport(
    tenantId: string,
    reportId: string,
    input: UpdateScheduledReportInput
  ) {
    const existing = await this.getScheduledReport(tenantId, reportId);
    if (!existing) {
      throw new Error('Scheduled report not found');
    }

    const frequency = input.frequency || existing.frequency;
    const dayOfWeek = input.dayOfWeek !== undefined ? input.dayOfWeek : existing.dayOfWeek;
    const dayOfMonth = input.dayOfMonth !== undefined ? input.dayOfMonth : existing.dayOfMonth;
    const timeOfDay = input.timeOfDay || existing.timeOfDay || '09:00';

    const nextRunAt = this.calculateNextRunTime(
      frequency as ReportFrequency,
      dayOfWeek,
      dayOfMonth,
      timeOfDay
    );

    // Build update object without format if not provided (to avoid type issues)
    const updateData: Record<string, unknown> = {
      nextRunAt,
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.reportType !== undefined) updateData.reportType = input.reportType;
    if (input.format !== undefined) updateData.format = input.format as 'csv' | 'json';
    if (input.frequency !== undefined) updateData.frequency = input.frequency;
    if (input.dayOfWeek !== undefined) updateData.dayOfWeek = input.dayOfWeek;
    if (input.dayOfMonth !== undefined) updateData.dayOfMonth = input.dayOfMonth;
    if (input.timeOfDay !== undefined) updateData.timeOfDay = input.timeOfDay;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.includeAllTime !== undefined) updateData.includeAllTime = input.includeAllTime;
    if (input.lookbackDays !== undefined) updateData.lookbackDays = input.lookbackDays;
    if (input.deliveryEmail !== undefined) updateData.deliveryEmail = input.deliveryEmail;
    if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled;

    await this.db
      .update(scheduledReports)
      .set(updateData)
      .where(and(
        eq(scheduledReports.id, reportId),
        eq(scheduledReports.tenantId, tenantId)
      ))
      .run();

    return this.getScheduledReport(tenantId, reportId);
  }

  /**
   * Delete a scheduled report
   */
  async deleteScheduledReport(tenantId: string, reportId: string) {
    // Delete associated runs first
    await this.db
      .delete(scheduledReportRuns)
      .where(and(
        eq(scheduledReportRuns.reportId, reportId),
        eq(scheduledReportRuns.tenantId, tenantId)
      ))
      .run();

    await this.db
      .delete(scheduledReports)
      .where(and(
        eq(scheduledReports.id, reportId),
        eq(scheduledReports.tenantId, tenantId)
      ))
      .run();
  }

  /**
   * Toggle enabled status
   */
  async toggleEnabled(tenantId: string, reportId: string, isEnabled: boolean) {
    return this.updateScheduledReport(tenantId, reportId, { isEnabled });
  }

  /**
   * Get reports due for execution
   */
  async getReportsDueForExecution() {
    const now = new Date();
    return this.db
      .select()
      .from(scheduledReports)
      .where(and(
        eq(scheduledReports.isEnabled, true),
        lte(scheduledReports.nextRunAt, now)
      ))
      .all();
  }

  /**
   * Get run history for a scheduled report
   */
  async getRunHistory(tenantId: string, reportId: string, limit: number = 10) {
    return this.db
      .select()
      .from(scheduledReportRuns)
      .where(and(
        eq(scheduledReportRuns.reportId, reportId),
        eq(scheduledReportRuns.tenantId, tenantId)
      ))
      .orderBy(desc(scheduledReportRuns.createdAt))
      .limit(limit)
      .all();
  }

  /**
   * Create a run record (for tracking executions)
   */
  async createRunRecord(
    reportId: string,
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ) {
    const id = nanoid();
    const now = new Date();

    await this.db.insert(scheduledReportRuns).values({
      id,
      reportId,
      tenantId,
      status: 'pending',
      periodStart,
      periodEnd,
      createdAt: now,
    }).run();

    return id;
  }

  /**
   * Update run status
   */
  async updateRunStatus(
    runId: string,
    status: RunStatus,
    details?: {
      recordCount?: number;
      fileSizeBytes?: number;
      errorMessage?: string;
      startedAt?: Date;
      completedAt?: Date;
      processingTimeMs?: number;
    }
  ) {
    const updateData: Record<string, unknown> = { status };

    if (details?.recordCount !== undefined) updateData.recordCount = details.recordCount;
    if (details?.fileSizeBytes !== undefined) updateData.fileSizeBytes = details.fileSizeBytes;
    if (details?.errorMessage !== undefined) updateData.errorMessage = details.errorMessage;
    if (details?.startedAt !== undefined) updateData.startedAt = details.startedAt;
    if (details?.completedAt !== undefined) updateData.completedAt = details.completedAt;
    if (details?.processingTimeMs !== undefined) updateData.processingTimeMs = details.processingTimeMs;

    await this.db
      .update(scheduledReportRuns)
      .set(updateData)
      .where(eq(scheduledReportRuns.id, runId))
      .run();
  }

  /**
   * Update report after successful run
   */
  async markReportRunSuccess(reportId: string) {
    const report = await this.db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.id, reportId))
      .get();

    if (!report) return;

    const nextRunAt = this.calculateNextRunTime(
      report.frequency as ReportFrequency,
      report.dayOfWeek,
      report.dayOfMonth,
      report.timeOfDay || '09:00'
    );

    await this.db
      .update(scheduledReports)
      .set({
        lastRunAt: new Date(),
        lastRunStatus: 'success',
        lastError: null,
        nextRunAt,
        runCount: (report.runCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(scheduledReports.id, reportId))
      .run();
  }

  /**
   * Update report after failed run
   */
  async markReportRunFailed(reportId: string, errorMessage: string) {
    await this.db
      .update(scheduledReports)
      .set({
        lastRunAt: new Date(),
        lastRunStatus: 'failed',
        lastError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(scheduledReports.id, reportId))
      .run();
  }
}
