export const ROLES = 
    ["ADMIN", 
    "TEACHER", 
    "STUDENT", 
    "GUEST"] as const;

export const BATCH_MODES = 
    ["ONLINE", 
    "OFFLINE"] as const;

export const APPLICATION_STATUS = 
    ["PENDING", 
    "APPROVED", 
    "REJECTED"] as const;

export const ENROLLMENT_STATUS =
    ["ACTIVE", 
    "INACTIVE",
    "HOLD",
    "BLOCKED",
    "ACTIVE SOON"] as const;

export const STATUS = 
    ["ACTIVE", 
    "INACTIVE",
    "HOLD",
    "BLOCKED",
    "ACTIVE SOON"
    ] as const;

export const ATTENDANCE_STATUS = 
    ["PRESENT", 
    "ABSENT"] as const;

export const HOLIDAY_STATUS = 
    ["PENDING", 
    "APPROVED"] as const;

export const HOLIDAY_APPLIED_BY = 
    ["ADMIN", 
    "TEACHER"] as const;

export const PAYMENT_STATUS = 
    ["PENDING", 
    "SUCCESS", 
    "FAILED"] as const;

export const ZOOM_STATUS = 
    ["SCHEDULED", 
    "LIVE", 
    "ENDED", 
    "CANCELLED"] as const;

export const ANNOUNCEMENT_URGENCY = 
    ["URGENT", 
    "NORMAL", 
    "REGULAR"] as const;

export const CLASS_PLAN_CODES = 
    ["TRIAL", 
    "CLASS_1", 
    "CLASS_2", 
    "CLASS_3"] as const;

export {};