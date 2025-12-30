import mongoose from "mongoose";
import { ValidationError } from "../errors/AppError";

/**
 * ===============================================
 * MONGODB VALIDATORS
 * ===============================================
 */

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @throws ValidationError if invalid
 */
export const validateObjectId = (id: string, fieldName: string = "ID"): void => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${fieldName}: ${id}`);
  }
};

/**
 * Validates an array of MongoDB ObjectIds
 * @throws ValidationError if any ID is invalid
 */
export const validateObjectIdArray = (
  ids: string[],
  fieldName: string = "IDs"
): void => {
  if (!Array.isArray(ids)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }

  ids.forEach((id, index) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(`Invalid ${fieldName}[${index}]: ${id}`);
    }
  });
};

/**
 * ===============================================
 * STRING VALIDATORS
 * ===============================================
 */

/**
 * Validates required string field
 * @throws ValidationError if validation fails
 */
export const validateRequiredString = (
  value: any,
  fieldName: string,
  minLength: number = 1,
  maxLength?: number
): void => {
  if (!value || typeof value !== "string") {
    throw new ValidationError(`${fieldName} is required and must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} character${minLength > 1 ? "s" : ""}`
    );
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} must not exceed ${maxLength} characters`);
  }
};

/**
 * Validates optional string field (if provided)
 * @throws ValidationError if validation fails
 */
export const validateOptionalString = (
  value: any,
  fieldName: string,
  minLength: number = 1,
  maxLength?: number
): void => {
  if (value === undefined || value === null) {
    return; // Optional field not provided
  }

  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  if (trimmed.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} character${minLength > 1 ? "s" : ""}`
    );
  }

  if (maxLength && trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} must not exceed ${maxLength} characters`);
  }
};

/**
 * ===============================================
 * NUMBER VALIDATORS
 * ===============================================
 */

/**
 * Validates a number is within a range
 * @throws ValidationError if validation fails
 */
export const validateNumberRange = (
  value: any,
  fieldName: string,
  min: number,
  max: number
): void => {
  const num = typeof value === "string" ? parseInt(value, 10) : value;

  if (isNaN(num) || typeof num !== "number") {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  if (num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }

  if (num > max) {
    throw new ValidationError(`${fieldName} must not exceed ${max}`);
  }
};

/**
 * ===============================================
 * ENUM VALIDATORS
 * ===============================================
 */

/**
 * Validates that a value is in an enum
 * @throws ValidationError if validation fails
 */
export const validateEnum = <T extends Record<string, string>>(
  value: any,
  enumObject: T,
  fieldName: string
): void => {
  if (!value) {
    return; // Optional enum
  }

  const validValues = Object.values(enumObject);

  if (!validValues.includes(value)) {
    throw new ValidationError(
      `Invalid ${fieldName}. Must be one of: ${validValues.join(", ")}`
    );
  }
};

/**
 * ===============================================
 * EMAIL VALIDATORS
 * ===============================================
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email format
 * @throws ValidationError if invalid
 */
export const validateEmail = (email: string): void => {
  if (!email || typeof email !== "string") {
    throw new ValidationError("Email is required");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError("Invalid email format");
  }
};

/**
 * ===============================================
 * PHONE VALIDATORS
 * ===============================================
 */

/**
 * Validates phone number (basic validation)
 * @throws ValidationError if invalid
 */
export const validatePhone = (phone: string, length: number = 10): void => {
  if (!phone || typeof phone !== "string") {
    throw new ValidationError("Phone number is required");
  }

  const cleaned = phone.replace(/\D/g, ""); // Remove non-digits

  if (cleaned.length !== length) {
    throw new ValidationError(`Phone number must be ${length} digits`);
  }
};

/**
 * ===============================================
 * PAGINATION VALIDATORS
 * ===============================================
 */

/**
 * Validates and parses pagination parameters
 * @returns Validated pagination object
 */
export const validatePagination = (query: any): { page: number; limit: number } => {
  const page = query.page ? parseInt(query.page, 10) : 1;
  const limit = query.limit ? parseInt(query.limit, 10) : 20;

  if (page < 1) {
    throw new ValidationError("Page must be greater than 0");
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError("Limit must be between 1 and 100");
  }

  return { page, limit };
};
