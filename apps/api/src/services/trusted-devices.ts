import { createHmac } from 'node:crypto';
import { eq, and, gt, lt } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { trustedDevices } from '../db/schema';
import { getCurrentTimestamp } from '../utils/timestamp';

export class TrustedDeviceService {
  /**
   * Generate a device fingerprint from request headers
   * This creates a unique identifier for the device based on User-Agent and other factors
   */
  static generateFingerprint(userAgent: string, ipAddress?: string): string {
    const components = [
      userAgent,
      ipAddress || 'unknown',
    ].join('|');

    const hash = createHmac('sha256', 'device-fingerprint-salt');
    hash.update(components);
    return hash.digest('hex');
  }

  /**
   * Parse User-Agent to create a human-readable device name
   */
  static parseDeviceName(userAgent: string): string {
    // Extract browser and OS info
    const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
    const osMatch = userAgent.match(/(Windows|Mac OS X|Linux|Android|iOS)/);

    const browser = browserMatch ? browserMatch[1] : 'Unknown Browser';
    const os = osMatch ? osMatch[1] : 'Unknown OS';

    return `${browser} on ${os}`;
  }

  /**
   * Check if a device is trusted for a user
   * Returns the trusted device record if found and not expired
   */
  static async isTrustedDevice(
    db: DrizzleD1Database<any>,
    userId: string,
    deviceFingerprint: string
  ): Promise<boolean> {
    const now = getCurrentTimestamp();

    const device = await db.select()
      .from(trustedDevices)
      .where(and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceFingerprint, deviceFingerprint),
        gt(trustedDevices.expiresAt, now)
      ))
      .get();

    if (device) {
      // Update last used timestamp
      await db.update(trustedDevices)
        .set({ lastUsedAt: now })
        .where(eq(trustedDevices.id, device.id));

      return true;
    }

    return false;
  }

  /**
   * Trust a device for 30 days
   */
  static async trustDevice(
    db: DrizzleD1Database<any>,
    userId: string,
    userAgent: string,
    ipAddress?: string
  ): Promise<string> {
    const deviceFingerprint = this.generateFingerprint(userAgent, ipAddress);
    const deviceName = this.parseDeviceName(userAgent);
    const now = getCurrentTimestamp();

    // Set expiry to 30 days from now
    const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

    // Check if device already exists
    const existing = await db.select()
      .from(trustedDevices)
      .where(and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceFingerprint, deviceFingerprint)
      ))
      .get();

    if (existing) {
      // Update expiry and last used
      await db.update(trustedDevices)
        .set({
          lastUsedAt: now,
          expiresAt,
        })
        .where(eq(trustedDevices.id, existing.id));

      return deviceFingerprint;
    }

    // Create new trusted device
    await db.insert(trustedDevices).values({
      id: crypto.randomUUID(),
      userId,
      deviceName,
      deviceFingerprint,
      ipAddress,
      userAgent,
      lastUsedAt: now,
      expiresAt,
      createdAt: now,
    });

    return deviceFingerprint;
  }

  /**
   * Get all trusted devices for a user
   */
  static async getTrustedDevices(
    db: DrizzleD1Database<any>,
    userId: string
  ) {
    const now = getCurrentTimestamp();

    return db.select()
      .from(trustedDevices)
      .where(and(
        eq(trustedDevices.userId, userId),
        gt(trustedDevices.expiresAt, now)
      ))
      .all();
  }

  /**
   * Remove a trusted device
   */
  static async removeTrustedDevice(
    db: DrizzleD1Database<any>,
    userId: string,
    deviceId: string
  ): Promise<boolean> {
    const result = await db.delete(trustedDevices)
      .where(and(
        eq(trustedDevices.id, deviceId),
        eq(trustedDevices.userId, userId)
      ))
      .returning();

    return result.length > 0;
  }

  /**
   * Clean up expired devices (can be run as a cron job)
   */
  static async cleanupExpiredDevices(db: DrizzleD1Database<any>) {
    const now = getCurrentTimestamp();

    await db.delete(trustedDevices)
      .where(lt(trustedDevices.expiresAt, now));
  }
}
