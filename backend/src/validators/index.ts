/**
 * ===============================================
 * VALIDATOR EXPORTS
 * ===============================================
 * Central export point for all validators
 */

// Common validators
export {
  validateObjectId,
  validateObjectIdArray,
  validateRequiredString,
  validateOptionalString,
  validateNumberRange,
  validateEnum,
  validateEmail,
  validatePhone,
  validatePagination,
} from "./common.validator";

// Domain-specific validators
export {
  AnnouncementUrgency,
  validateCreateAnnouncementInput,
  validateUpdateAnnouncementInput,
} from "./announcement.validator";
