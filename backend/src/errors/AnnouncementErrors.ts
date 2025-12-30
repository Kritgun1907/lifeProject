import { NotFoundError, AuthorizationError } from "./AppError";

/**
 * ===============================================
 * ANNOUNCEMENT DOMAIN ERRORS
 * ===============================================
 */

export class AnnouncementNotFoundError extends NotFoundError {
  constructor(announcementId: string) {
    super("Announcement", announcementId);
    this.name = "AnnouncementNotFoundError";
  }
}

export class UnauthorizedAnnouncementAccessError extends AuthorizationError {
  constructor(action: string) {
    super(`You are not authorized to ${action} this announcement`);
    this.name = "UnauthorizedAnnouncementAccessError";
  }
}
