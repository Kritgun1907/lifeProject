import {
  validateRequiredString,
  validateOptionalString,
  validateObjectIdArray,
  validateEnum,
} from "./common.validator";
import { ValidationError } from "../errors/AppError";

/**
 * ===============================================
 * ANNOUNCEMENT VALIDATORS
 * ===============================================
 * Specific validation functions for announcement operations
 */

export enum AnnouncementUrgency {
  URGENT = "URGENT",
  NORMAL = "NORMAL",
  REGULAR = "REGULAR",
}

/**
 * Validates announcement creation input
 * @throws ValidationError if validation fails
 */
export const validateCreateAnnouncementInput = (body: any): void => {
  const { title, description, urgency, batchIds } = body;

  // Validate required fields
  validateRequiredString(title, "Title", 1, 200);
  validateRequiredString(description, "Description", 1, 2000);

  // Validate optional enum
  if (urgency) {
    validateEnum(urgency, AnnouncementUrgency, "urgency");
  }

  // Validate optional batch IDs array
  if (batchIds !== undefined) {
    validateObjectIdArray(batchIds, "batchIds");
  }
};

/**
 * Validates announcement update input
 * @throws ValidationError if validation fails
 */
export const validateUpdateAnnouncementInput = (input: {
  title?: string;
  description?: string;
  urgency?: string;
  contentType?: string;
  targetAudience?: string;
  isPinned?: boolean;
  expiresAt?: string | Date;
  batchIds?: string[];
}): void => {
  const {
    title,
    description,
    urgency,
    contentType,
    targetAudience,
    isPinned,
    expiresAt,
    batchIds,
  } = input;

  // At least one updatable field must be present
  const hasAnyField =
    title !== undefined ||
    description !== undefined ||
    urgency !== undefined ||
    contentType !== undefined ||
    targetAudience !== undefined ||
    isPinned !== undefined ||
    expiresAt !== undefined ||
    batchIds !== undefined;

  if (!hasAnyField) {
    throw new ValidationError("At least one field must be provided for update");
  }

  // Preserve existing title/description validation rules
  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0 || title.length > 200) {
      throw new ValidationError(
        "Title is required and must be between 1 and 200 characters"
      );
    }
  }

  if (description !== undefined) {
    if (typeof description !== "string" || description.trim().length === 0) {
      throw new ValidationError("Description is required");
    }
  }

  // Validate optional fields (if provided)
  if (urgency !== undefined) {
    validateEnum(urgency, AnnouncementUrgency, "urgency");
  }

  if (batchIds !== undefined) {
    validateObjectIdArray(batchIds, "batchIds");
  }
};
