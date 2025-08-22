/**
 * Data Privacy & GDPR Compliance for Recipe Favoriting + User Engagement System
 * 
 * Comprehensive privacy framework ensuring GDPR, CCPA, and other privacy law compliance
 * for user data collection, processing, storage, and deletion.
 */

import { z } from "zod";

// =============================================================================
// PRIVACY CONSENT MANAGEMENT
// =============================================================================

export const consentTypeEnum = [
  "analytics",              // Analytics and engagement tracking
  "personalization",        // Personalized recommendations  
  "marketing",             // Marketing communications
  "social_features",       // Social features and following
  "performance_cookies",   // Performance and optimization cookies
  "functional_cookies",    // Functional cookies for user experience
  "advertising",          // Advertising and ad personalization
] as const;

export type ConsentType = typeof consentTypeEnum[number];

export interface UserConsent {
  userId: string;
  consents: Record<ConsentType, {
    granted: boolean;
    timestamp: Date;
    version: string;        // Consent policy version
    source: string;         // How consent was obtained
    ipAddress?: string;     // IP when consent was given (hashed)
    userAgent?: string;     // User agent when consent was given
    expiresAt?: Date;       // When consent expires (if applicable)
  }>;
  lastUpdated: Date;
}

// Consent validation schema
export const userConsentSchema = z.object({
  analytics: z.boolean(),
  personalization: z.boolean(),
  marketing: z.boolean(),
  social_features: z.boolean(),
  performance_cookies: z.boolean(),
  functional_cookies: z.boolean(),
  advertising: z.boolean(),
});

export const updateConsentSchema = z.object({
  consents: userConsentSchema,
  policyVersion: z.string(),
  source: z.enum(["banner", "settings", "registration", "api"]),
});

// =============================================================================
// DATA CLASSIFICATION & RETENTION
// =============================================================================

export const DataClassification = {
  // Personal Identifiable Information (PII)
  PII: {
    HIGH_RISK: [
      "email",
      "full_name", 
      "phone_number",
      "precise_location",
      "payment_info",
    ],
    MEDIUM_RISK: [
      "profile_picture",
      "dietary_preferences", 
      "health_conditions",
      "approximate_location",
    ],
    LOW_RISK: [
      "username",
      "display_name",
      "public_profile_data",
    ],
  },
  
  // Behavioral Data
  BEHAVIORAL: {
    IDENTIFIABLE: [
      "recipe_views",
      "search_queries",
      "favorites",
      "ratings",
      "social_interactions",
    ],
    AGGREGATED: [
      "usage_statistics",
      "popular_content",
      "trending_data",
      "performance_metrics",
    ],
  },
  
  // Technical Data
  TECHNICAL: {
    TRACKING: [
      "ip_address",
      "device_fingerprint", 
      "user_agent",
      "session_data",
      "cookie_data",
    ],
    PERFORMANCE: [
      "page_load_times",
      "error_logs",
      "system_metrics",
    ],
  },
} as const;

// Data retention periods (in days)
export const RetentionPeriods = {
  USER_PROFILE: 2555,           // 7 years (legal requirement)
  RECIPE_INTERACTIONS: 1095,    // 3 years (analytics value)
  SEARCH_QUERIES: 365,          // 1 year (personalization)
  SESSION_DATA: 90,             // 3 months (technical necessity)
  RECOMMENDATION_DATA: 730,     // 2 years (ML model training)
  SOCIAL_INTERACTIONS: 1825,    // 5 years (relationship data)
  ANALYTICS_AGGREGATED: 2555,   // 7 years (business insights)
  MARKETING_DATA: 1095,         // 3 years (marketing campaigns)
  CONSENT_RECORDS: 2555,        // 7 years (legal requirement)
  AUDIT_LOGS: 2555,             // 7 years (compliance)
  
  // Special cases
  DELETED_USER_AUDIT: 2555,     // Keep deletion records for compliance
  SUSPICIOUS_ACTIVITY: 2555,    // Security incident records
  LEGAL_HOLD: -1,               // Indefinite (until legal matter resolved)
} as const;

// =============================================================================
// DATA ANONYMIZATION & PSEUDONYMIZATION
// =============================================================================

export interface AnonymizationConfig {
  // Techniques for different data types
  TECHNIQUES: {
    IP_ADDRESSES: "hash_with_salt";      // Hash IP addresses with salt
    EMAIL_ADDRESSES: "domain_generalization"; // Keep domain, anonymize local part
    LOCATION_DATA: "geographic_aggregation";  // City/region level only
    TIMESTAMPS: "temporal_aggregation";       // Round to hour/day level
    USER_AGENTS: "signature_extraction";      // Extract browser/OS only
    SEARCH_QUERIES: "topic_categorization";   // Convert to topic categories
    RECIPE_VIEWS: "interest_profiling";       // Convert to interest profiles
  };
  
  // Anonymization thresholds
  THRESHOLDS: {
    MIN_GROUP_SIZE: 5;           // k-anonymity minimum group size
    MAX_QUASI_IDENTIFIERS: 3;    // Maximum quasi-identifiers per record
    DIFFERENTIAL_PRIVACY_EPSILON: 1.0; // Privacy budget for DP
  };
  
  // Pseudonymization keys (rotate regularly)
  PSEUDONYM_KEYS: {
    USER_ID_SALT: string;
    IP_HASH_SALT: string;
    SESSION_ID_SALT: string;
    DEVICE_ID_SALT: string;
  };
}

// Anonymization utility functions
export const AnonymizationUtils = {
  // Hash IP address with salt for privacy
  hashIpAddress: (ip: string, salt: string): string => {
    // Implementation would use crypto.pbkdf2 or similar
    return `hashed_${ip.slice(-4)}`; // Placeholder
  },
  
  // Anonymize email while preserving domain for analytics
  anonymizeEmail: (email: string): string => {
    const [, domain] = email.split('@');
    return `anonymous@${domain}`;
  },
  
  // Generalize location to city/region level
  generalizeLocation: (lat: number, lng: number): {city: string, region: string} => {
    // Implementation would use reverse geocoding
    return {city: "generalized_city", region: "generalized_region"};
  },
  
  // Convert precise timestamp to aggregated time bucket
  aggregateTimestamp: (timestamp: Date, granularity: 'hour' | 'day'): Date => {
    const date = new Date(timestamp);
    if (granularity === 'hour') {
      date.setMinutes(0, 0, 0);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  },
} as const;

// =============================================================================
// DATA SUBJECT RIGHTS (GDPR)
// =============================================================================

export const DataSubjectRights = {
  // Right to Access (Article 15)
  ACCESS: {
    RESPONSE_TIME: 30, // days
    INCLUDED_DATA: [
      "user_profile",
      "recipe_interactions", 
      "favorites_collections",
      "social_connections",
      "recommendation_history",
      "consent_records",
      "analytics_data",
    ],
    EXPORT_FORMAT: "json", // JSON or CSV
  },
  
  // Right to Rectification (Article 16)
  RECTIFICATION: {
    RESPONSE_TIME: 30, // days
    UPDATABLE_FIELDS: [
      "name",
      "email", 
      "dietary_preferences",
      "profile_picture",
      "location",
      "privacy_settings",
    ],
  },
  
  // Right to Erasure (Article 17)
  ERASURE: {
    RESPONSE_TIME: 30, // days
    DELETION_TYPES: {
      SOFT_DELETE: "mark_deleted", // Mark as deleted, anonymize after retention
      HARD_DELETE: "immediate",    // Immediate removal
      ANONYMIZE: "pseudonymize",   // Convert to anonymous data
    },
    EXCEPTIONS: [
      "legal_obligations",
      "public_interest",
      "scientific_research",
      "freedom_of_expression",
    ],
  },
  
  // Right to Portability (Article 20)
  PORTABILITY: {
    RESPONSE_TIME: 30, // days
    EXPORT_FORMATS: ["json", "csv", "xml"],
    INCLUDED_DATA: [
      "user_provided_data",
      "favorites_collections",
      "recipe_ratings",
      "social_connections",
    ],
  },
  
  // Right to Object (Article 21)
  OBJECTION: {
    RESPONSE_TIME: 30, // days
    OBJECTION_TYPES: [
      "direct_marketing",
      "profiling",
      "automated_decision_making",
      "legitimate_interest_processing",
    ],
  },
} as const;

// =============================================================================
// PRIVACY BY DESIGN IMPLEMENTATION
// =============================================================================

export const PrivacyByDesign = {
  // Data Minimization Principles
  DATA_MINIMIZATION: {
    // Only collect data necessary for specific purpose
    PURPOSE_LIMITATION: {
      ANALYTICS: ["page_views", "click_events", "session_duration"],
      PERSONALIZATION: ["favorites", "ratings", "dietary_preferences"],
      SOCIAL_FEATURES: ["connections", "shared_content"],
      RECOMMENDATIONS: ["interaction_history", "preferences", "ratings"],
    },
    
    // Automatic data expiration
    AUTOMATIC_EXPIRATION: {
      SESSION_DATA: 24 * 60 * 60 * 1000,      // 24 hours
      TEMPORARY_TOKENS: 15 * 60 * 1000,        // 15 minutes
      SEARCH_SUGGESTIONS: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  },
  
  // Purpose Limitation
  PURPOSE_SPECIFICATION: {
    ANALYTICS: "Improve user experience and application performance",
    PERSONALIZATION: "Provide personalized recipe recommendations",
    SOCIAL_FEATURES: "Enable social interaction and content sharing",
    MARKETING: "Send relevant product updates and offers",
    SECURITY: "Detect and prevent fraudulent activity",
  },
  
  // Storage Limitation
  STORAGE_CONTROLS: {
    AUTOMATIC_DELETION: true,
    REGULAR_AUDITS: true,
    RETENTION_MONITORING: true,
    SECURE_DELETION: true,
  },
  
  // Accuracy Measures
  DATA_ACCURACY: {
    VALIDATION_RULES: true,
    UPDATE_MECHANISMS: true,
    ERROR_CORRECTION: true,
    QUALITY_MONITORING: true,
  },
} as const;

// =============================================================================
// SECURITY & ENCRYPTION
// =============================================================================

export const SecurityMeasures = {
  // Encryption Standards
  ENCRYPTION: {
    AT_REST: "AES-256",           // Database encryption
    IN_TRANSIT: "TLS 1.3",        // Network encryption
    FIELD_LEVEL: "AES-256-GCM",   // Sensitive field encryption
    KEY_MANAGEMENT: "HSM",         // Hardware Security Module
  },
  
  // Access Controls
  ACCESS_CONTROL: {
    AUTHENTICATION: "multi_factor", // MFA required
    AUTHORIZATION: "rbac",          // Role-based access control
    AUDIT_LOGGING: true,            // All access logged
    SESSION_MANAGEMENT: "secure",   // Secure session handling
  },
  
  // Data Protection
  DATA_PROTECTION: {
    BACKUP_ENCRYPTION: true,
    SECURE_DELETION: true,
    INTEGRITY_CHECKING: true,
    BREACH_DETECTION: true,
  },
} as const;

// =============================================================================
// COMPLIANCE MONITORING & AUDITING
// =============================================================================

export const ComplianceMonitoring = {
  // Audit Requirements
  AUDIT_LOGS: {
    DATA_ACCESS: "log_all_access",
    DATA_MODIFICATION: "log_all_changes", 
    CONSENT_CHANGES: "log_consent_updates",
    DELETION_REQUESTS: "log_deletion_actions",
    EXPORT_REQUESTS: "log_data_exports",
  },
  
  // Regular Assessments
  ASSESSMENTS: {
    PRIVACY_IMPACT: "quarterly",     // Privacy Impact Assessments
    DATA_AUDIT: "monthly",           // Data inventory audits
    CONSENT_REVIEW: "monthly",       // Consent management review
    SECURITY_REVIEW: "weekly",       // Security posture review
    RETENTION_CLEANUP: "daily",      // Automated retention cleanup
  },
  
  // Compliance Reporting
  REPORTING: {
    GDPR_COMPLIANCE: "monthly",
    CCPA_COMPLIANCE: "quarterly", 
    BREACH_NOTIFICATIONS: "immediate",
    AUTHORITY_REPORTS: "as_required",
  },
} as const;

// =============================================================================
// DATA BREACH RESPONSE
// =============================================================================

export const BreachResponse = {
  // Detection & Classification
  DETECTION: {
    AUTOMATED_MONITORING: true,
    ANOMALY_DETECTION: true,
    STAFF_TRAINING: true,
    INCIDENT_REPORTING: true,
  },
  
  // Response Timeline
  TIMELINE: {
    DETECTION_TO_CONTAINMENT: 2,    // hours
    CONTAINMENT_TO_ASSESSMENT: 24,  // hours
    ASSESSMENT_TO_NOTIFICATION: 72, // hours (GDPR requirement)
    INVESTIGATION_COMPLETION: 30,   // days
  },
  
  // Notification Requirements
  NOTIFICATIONS: {
    SUPERVISORY_AUTHORITY: 72,      // hours (GDPR)
    DATA_SUBJECTS: 72,              // hours (if high risk)
    INTERNAL_STAKEHOLDERS: 2,       // hours
    LAW_ENFORCEMENT: "as_required",
  },
  
  // Documentation Requirements
  DOCUMENTATION: {
    INCIDENT_DETAILS: true,
    AFFECTED_DATA_TYPES: true,
    IMPACT_ASSESSMENT: true,
    REMEDIATION_ACTIONS: true,
    LESSONS_LEARNED: true,
  },
} as const;

// =============================================================================
// API SCHEMAS FOR PRIVACY OPERATIONS
// =============================================================================

// User consent update schema
export const updateUserConsentSchema = z.object({
  userId: z.string().uuid(),
  consents: userConsentSchema,
  policyVersion: z.string(),
  source: z.enum(["banner", "settings", "registration", "api"]),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
});

// Data export request schema
export const dataExportRequestSchema = z.object({
  userId: z.string().uuid(),
  requestType: z.enum(["access", "portability"]),
  format: z.enum(["json", "csv", "xml"]),
  includeData: z.array(z.string()),
  deliveryMethod: z.enum(["download", "email"]),
});

// Data deletion request schema
export const dataDeletionRequestSchema = z.object({
  userId: z.string().uuid(),
  deletionType: z.enum(["soft_delete", "hard_delete", "anonymize"]),
  reason: z.string(),
  retainForLegal: z.boolean().default(false),
  confirmationRequired: z.boolean().default(true),
});

// Privacy settings schema
export const privacySettingsSchema = z.object({
  dataRetention: z.object({
    analytics: z.number().min(0).max(2555),
    recommendations: z.number().min(0).max(2555),
    social: z.number().min(0).max(2555),
  }),
  visibility: z.object({
    profile: z.enum(["public", "friends", "private"]),
    favorites: z.enum(["public", "friends", "private"]),
    collections: z.enum(["public", "friends", "private"]),
    activity: z.enum(["public", "friends", "private"]),
  }),
  communications: z.object({
    email_notifications: z.boolean(),
    push_notifications: z.boolean(),
    marketing_emails: z.boolean(),
    social_notifications: z.boolean(),
  }),
});

// Export types for use in application
export type UpdateUserConsent = z.infer<typeof updateUserConsentSchema>;
export type DataExportRequest = z.infer<typeof dataExportRequestSchema>;
export type DataDeletionRequest = z.infer<typeof dataDeletionRequestSchema>;
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;

// =============================================================================
// PRIVACY-COMPLIANT ANALYTICS
// =============================================================================

export const PrivacyCompliantAnalytics = {
  // Differential Privacy Parameters
  DIFFERENTIAL_PRIVACY: {
    EPSILON: 1.0,                    // Privacy budget
    DELTA: 1e-5,                     // Failure probability
    SENSITIVITY: 1.0,                // Maximum contribution per user
    NOISE_MECHANISM: "laplace",      // Noise distribution
  },
  
  // Aggregation Thresholds
  AGGREGATION: {
    MIN_GROUP_SIZE: 10,              // Minimum group size for reporting
    SUPPRESSION_THRESHOLD: 5,        // Suppress groups smaller than this
    PERTURBATION_RANGE: 0.1,         // Random perturbation range
  },
  
  // Data Collection Limits
  COLLECTION_LIMITS: {
    DAILY_EVENTS_PER_USER: 1000,     // Max events per user per day
    SESSION_DURATION_LIMIT: 8 * 3600, // 8 hours max session
    BATCH_SIZE_LIMIT: 10000,          // Max batch size for processing
  },
} as const;