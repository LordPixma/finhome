import { randomBytes, createHmac } from 'node:crypto';

/**
 * Multi-Factor Authentication Service for Global Admins
 * Implements TOTP (Time-based One-Time Password) authentication without external dependencies
 */

// Base32 encoding utilities
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(buffer: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return result;
}

function decodeBase32(encoded: string): Uint8Array {
  const cleanInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const buffer = new Uint8Array(Math.ceil(cleanInput.length * 5 / 8));
  
  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < cleanInput.length; i++) {
    const char = cleanInput[i];
    const charValue = BASE32_ALPHABET.indexOf(char);
    
    if (charValue === -1) continue;
    
    value = (value << 5) | charValue;
    bits += 5;

    if (bits >= 8) {
      buffer[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return buffer.slice(0, index);
}

export class MFAService {
  private static readonly TOTP_WINDOW = 30; // 30 seconds
  private static readonly TOTP_DIGITS = 6;
  private static readonly BACKUP_CODES_COUNT = 10;

  /**
   * Generate a new TOTP secret for a user
   */
  static generateSecret(): string {
    const secret = randomBytes(20);
    return encodeBase32(new Uint8Array(secret));
  }

  /**
   * Generate backup codes for account recovery
   */
  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      // Generate 8-digit backup codes
      const code = randomBytes(4).readUInt32BE(0).toString().padStart(8, '0').slice(0, 8);
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate TOTP token for a given secret and time
   */
  static generateTOTP(secret: string, timeStep?: number): string {
    const time = timeStep || Math.floor(Date.now() / 1000 / this.TOTP_WINDOW);
    const secretBuffer = Buffer.from(decodeBase32(secret));
    
    // Convert time to 8-byte buffer
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(Math.floor(time / Math.pow(2, 32)), 0);
    timeBuffer.writeUInt32BE(time & 0xffffffff, 4);

    // HMAC-SHA1
    const hmac = createHmac('sha1', secretBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);

    return (code % Math.pow(10, this.TOTP_DIGITS)).toString().padStart(this.TOTP_DIGITS, '0');
  }

  /**
   * Verify a TOTP token against a secret
   */
  static verifyTOTP(token: string, secret: string, allowedDrift: number = 1): boolean {
    const currentTimeStep = Math.floor(Date.now() / 1000 / this.TOTP_WINDOW);
    
    // Check current time and allowed drift (±1 window by default)
    for (let i = -allowedDrift; i <= allowedDrift; i++) {
      const expectedToken = this.generateTOTP(secret, currentTimeStep + i);
      if (expectedToken === token) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate a QR code URL for TOTP setup (manual entry format)
   */
  static generateQRCodeURL(secret: string, email: string, issuer: string = 'Finhome'): string {
    const label = encodeURIComponent(`${issuer}:${email}`);
    const params = new URLSearchParams({
      secret: secret,
      issuer: issuer,
      algorithm: 'SHA1',
      digits: this.TOTP_DIGITS.toString(),
      period: this.TOTP_WINDOW.toString()
    });
    
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  /**
   * Generate QR code data URL (returns the otpauth URL for external QR generation)
   */
  static async generateQRCode(secret: string, email: string, issuer: string = 'Finhome'): Promise<string> {
    // Return the otpauth URL - frontend can use this with a QR code library
    return this.generateQRCodeURL(secret, email, issuer);
  }

  /**
   * Verify a backup code
   */
  static verifyBackupCode(inputCode: string, validCodes: string[]): boolean {
    return validCodes.includes(inputCode);
  }

  /**
   * Hash backup codes for secure storage
   */
  static hashBackupCodes(codes: string[]): string[] {
    return codes.map(code => {
      const hash = createHmac('sha256', 'backup-code-salt');
      hash.update(code);
      return hash.digest('hex');
    });
  }

  /**
   * Verify a backup code against hashed codes
   */
  static verifyHashedBackupCode(inputCode: string, hashedCodes: string[]): boolean {
    const hash = createHmac('sha256', 'backup-code-salt');
    hash.update(inputCode);
    const inputHash = hash.digest('hex');
    
    return hashedCodes.includes(inputHash);
  }

  /**
   * Generate MFA setup data for a user
   */
  static generateMFASetup(email: string): {
    secret: string;
    qrCodeURL: string;
    backupCodes: string[];
    hashedBackupCodes: string[];
  } {
    const secret = this.generateSecret();
    const qrCodeURL = this.generateQRCodeURL(secret, email);
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = this.hashBackupCodes(backupCodes);

    return {
      secret,
      qrCodeURL,
      backupCodes,
      hashedBackupCodes
    };
  }
}