export class ValidationUtils {
  static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  static readonly USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
  static readonly PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  static readonly PHONE_REGEX = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;

  static isValidEmail(email: string): boolean {
    return this.EMAIL_REGEX.test(email?.trim());
  }

  static isValidUsername(username: string): boolean {
    return this.USERNAME_REGEX.test(username?.trim());
  }

  static isValidPassword(password: string): { valid: boolean; message?: string } {
    if (!password || password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!this.PASSWORD_REGEX.test(password)) {
      return { valid: false, message: 'Password must contain uppercase, lowercase, and number' };
    }
    return { valid: true };
  }

  static isValidDateRange(startDate: string | Date, endDate: string | Date): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return end > start;
  }

  static trimObject<T extends Record<string, any>>(obj: T): T {
    const trimmed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        trimmed[key] = value.trim();
      } else {
        trimmed[key] = value;
      }
    }
    return trimmed;
  }
  
  static isValidCronExpression(cron: string): boolean {
    if (!cron) return false;
    const parts = cron.trim().split(/\s+/);
    return parts.length >= 5 && parts.length <= 6;
  }
  
  static isNotEmpty(value: string | null | undefined): boolean {
    return value !== null && value !== undefined && value.trim().length > 0;
  }
  
  static hasMinLength(value: string, minLength: number): boolean {
    return value?.trim().length >= minLength;
  }
  
  static hasMaxLength(value: string, maxLength: number): boolean {
    return value?.trim().length <= maxLength;
  }
}
