import { ValidationUtils } from './validation.utils';

describe('ValidationUtils', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(ValidationUtils.isValidEmail('test@example.com')).toBeTrue();
      expect(ValidationUtils.isValidEmail('user.name@domain.co.uk')).toBeTrue();
    });

    it('should reject invalid emails', () => {
      expect(ValidationUtils.isValidEmail('invalid')).toBeFalse();
      expect(ValidationUtils.isValidEmail('@example.com')).toBeFalse();
      expect(ValidationUtils.isValidEmail('test@')).toBeFalse();
      expect(ValidationUtils.isValidEmail('')).toBeFalse();
    });
  });

  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      expect(ValidationUtils.isValidUsername('user123')).toBeTrue();
      expect(ValidationUtils.isValidUsername('test_user')).toBeTrue();
    });

    it('should reject invalid usernames', () => {
      expect(ValidationUtils.isValidUsername('ab')).toBeFalse();
      expect(ValidationUtils.isValidUsername('user-name')).toBeFalse();
      expect(ValidationUtils.isValidUsername('verylongusernamethatexceeds')).toBeFalse();
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      const result = ValidationUtils.isValidPassword('Password1');
      expect(result.valid).toBeTrue();
    });

    it('should reject short passwords', () => {
      const result = ValidationUtils.isValidPassword('Pass1');
      expect(result.valid).toBeFalse();
      expect(result.message).toContain('8 characters');
    });

    it('should reject weak passwords', () => {
      const result = ValidationUtils.isValidPassword('password');
      expect(result.valid).toBeFalse();
      expect(result.message).toContain('uppercase');
    });
  });

  describe('isValidDateRange', () => {
    it('should validate correct date ranges', () => {
      expect(ValidationUtils.isValidDateRange('2024-01-01', '2024-01-02')).toBeTrue();
    });

    it('should reject invalid date ranges', () => {
      expect(ValidationUtils.isValidDateRange('2024-01-02', '2024-01-01')).toBeFalse();
    });
  });

  describe('trimObject', () => {
    it('should trim string values', () => {
      const result = ValidationUtils.trimObject({ name: '  John  ', age: 30 });
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
    });
  });

  describe('isValidCronExpression', () => {
    it('should validate 5-part cron', () => {
      expect(ValidationUtils.isValidCronExpression('0 0 * * *')).toBeTrue();
    });

    it('should validate 6-part cron', () => {
      expect(ValidationUtils.isValidCronExpression('0 0 * * * *')).toBeTrue();
    });

    it('should reject invalid cron', () => {
      expect(ValidationUtils.isValidCronExpression('0 0 * *')).toBeFalse();
      expect(ValidationUtils.isValidCronExpression('')).toBeFalse();
    });
  });

  describe('isNotEmpty', () => {
    it('should validate non-empty strings', () => {
      expect(ValidationUtils.isNotEmpty('hello')).toBeTrue();
    });

    it('should reject empty or null values', () => {
      expect(ValidationUtils.isNotEmpty('')).toBeFalse();
      expect(ValidationUtils.isNotEmpty(null)).toBeFalse();
      expect(ValidationUtils.isNotEmpty(undefined)).toBeFalse();
    });
  });

  describe('hasMinLength', () => {
    it('should validate minimum length', () => {
      expect(ValidationUtils.hasMinLength('hello', 3)).toBeTrue();
      expect(ValidationUtils.hasMinLength('hi', 3)).toBeFalse();
    });
  });

  describe('hasMaxLength', () => {
    it('should validate maximum length', () => {
      expect(ValidationUtils.hasMaxLength('hello', 10)).toBeTrue();
      expect(ValidationUtils.hasMaxLength('hello world', 5)).toBeFalse();
    });
  });
});
