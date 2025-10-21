# 🔒 **PRIVACY COMPLIANCE & DATA GOVERNANCE FRAMEWORK**
## FitnessMealPlanner Analytics System

---

## **🛡️ REGULATORY COMPLIANCE OVERVIEW**

### **Supported Regulations**
- **GDPR** (General Data Protection Regulation) - EU
- **CCPA** (California Consumer Privacy Act) - California, US
- **PIPEDA** (Personal Information Protection and Electronic Documents Act) - Canada
- **HIPAA** (Health Insurance Portability and Accountability Act) - Healthcare data
- **SOC 2** (Service Organization Control 2) - Data security

### **Key Compliance Principles**
1. **Lawful Basis for Processing** - Explicit consent for analytics
2. **Data Minimization** - Collect only necessary data
3. **Purpose Limitation** - Use data only for stated purposes
4. **Storage Limitation** - Retain data only as long as necessary
5. **Transparency** - Clear communication about data usage
6. **Data Subject Rights** - Access, portability, erasure, objection

---

## **📋 DATA CLASSIFICATION & GOVERNANCE**

### **Data Classification Matrix**

```typescript
// server/utils/dataClassification.ts
export enum DataClassification {
  PUBLIC = 'public',              // Public information, no restrictions
  INTERNAL = 'internal',          // Internal business use only
  CONFIDENTIAL = 'confidential',  // Sensitive business data
  RESTRICTED = 'restricted',      // Personal data, requires consent
  HIGHLY_RESTRICTED = 'highly_restricted' // Health data, special categories
}

export enum DataCategory {
  IDENTITY = 'identity',          // Name, email, ID
  CONTACT = 'contact',           // Address, phone
  BEHAVIORAL = 'behavioral',     // Usage patterns, interactions
  HEALTH = 'health',             // Measurements, photos, goals
  FINANCIAL = 'financial',       // Payment info, revenue data
  TECHNICAL = 'technical',       // IP, browser, session data
  DERIVED = 'derived'            // AI predictions, analytics
}

interface DataElement {
  field: string;
  classification: DataClassification;
  category: DataCategory;
  personalData: boolean;
  sensitiveData: boolean;
  legalBasis: LegalBasis[];
  retentionPeriod: number; // days
  anonymizable: boolean;
  requiredConsent: ConsentType[];
}

// Data classification for analytics tables
export const ANALYTICS_DATA_CLASSIFICATION: DataElement[] = [
  {
    field: 'customer_id',
    classification: DataClassification.RESTRICTED,
    category: DataCategory.IDENTITY,
    personalData: true,
    sensitiveData: false,
    legalBasis: [LegalBasis.CONSENT, LegalBasis.LEGITIMATE_INTEREST],
    retentionPeriod: 1095, // 3 years
    anonymizable: true,
    requiredConsent: [ConsentType.ANALYTICS, ConsentType.PERFORMANCE_TRACKING]
  },
  {
    field: 'engagement_score',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.BEHAVIORAL,
    personalData: true,
    sensitiveData: false,
    legalBasis: [LegalBasis.CONSENT],
    retentionPeriod: 730, // 2 years
    anonymizable: true,
    requiredConsent: [ConsentType.BEHAVIORAL_ANALYSIS]
  },
  {
    field: 'churn_probability',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.DERIVED,
    personalData: true,
    sensitiveData: false,
    legalBasis: [LegalBasis.CONSENT],
    retentionPeriod: 365, // 1 year
    anonymizable: true,
    requiredConsent: [ConsentType.PREDICTIVE_MODELING]
  },
  {
    field: 'body_measurements',
    classification: DataClassification.HIGHLY_RESTRICTED,
    category: DataCategory.HEALTH,
    personalData: true,
    sensitiveData: true,
    legalBasis: [LegalBasis.EXPLICIT_CONSENT],
    retentionPeriod: 2555, // 7 years (health data)
    anonymizable: false,
    requiredConsent: [ConsentType.HEALTH_DATA_PROCESSING]
  }
];
```

### **Legal Basis for Processing**

```typescript
export enum LegalBasis {
  CONSENT = 'consent',                    // Article 6(1)(a) GDPR
  CONTRACT = 'contract',                  // Article 6(1)(b) GDPR
  LEGAL_OBLIGATION = 'legal_obligation',  // Article 6(1)(c) GDPR
  VITAL_INTERESTS = 'vital_interests',    // Article 6(1)(d) GDPR
  PUBLIC_TASK = 'public_task',           // Article 6(1)(e) GDPR
  LEGITIMATE_INTEREST = 'legitimate_interest', // Article 6(1)(f) GDPR
  EXPLICIT_CONSENT = 'explicit_consent'   // Article 9(2)(a) GDPR (special categories)
}

export enum ConsentType {
  ANALYTICS = 'analytics',
  PERFORMANCE_TRACKING = 'performance_tracking',
  BEHAVIORAL_ANALYSIS = 'behavioral_analysis',
  PREDICTIVE_MODELING = 'predictive_modeling',
  HEALTH_DATA_PROCESSING = 'health_data_processing',
  MARKETING = 'marketing',
  PROFILING = 'profiling'
}
```

---

## **✅ CONSENT MANAGEMENT SYSTEM**

### **Granular Consent Interface**

```typescript
// client/src/components/privacy/ConsentManager.tsx
interface ConsentPreferences {
  analytics: boolean;
  performanceTracking: boolean;
  behavioralAnalysis: boolean;
  predictiveModeling: boolean;
  healthDataProcessing: boolean;
  marketing: boolean;
  profiling: boolean;
  dataRetentionPeriod: number;
  lastUpdated: Date;
}

const ConsentManager: React.FC = () => {
  const [consent, setConsent] = useState<ConsentPreferences>({
    analytics: false,
    performanceTracking: false,
    behavioralAnalysis: false,
    predictiveModeling: false,
    healthDataProcessing: false,
    marketing: false,
    profiling: false,
    dataRetentionPeriod: 365,
    lastUpdated: new Date()
  });

  const consentDescriptions = {
    analytics: {
      title: "Basic Analytics",
      description: "Allow us to track basic usage statistics to improve our service",
      requiredFor: "Tier 2 Analytics features",
      dataTypes: ["Page views", "Feature usage", "Session duration"],
      retention: "2 years"
    },
    behavioralAnalysis: {
      title: "Behavioral Analysis",
      description: "Analyze your interaction patterns to provide personalized recommendations",
      requiredFor: "Tier 3 Personalization features",
      dataTypes: ["Click patterns", "Recipe preferences", "Usage behaviors"],
      retention: "2 years"
    },
    predictiveModeling: {
      title: "Predictive Modeling",
      description: "Use AI to predict outcomes and provide proactive recommendations",
      requiredFor: "Tier 3 Predictive Insights",
      dataTypes: ["Historical behavior", "AI predictions", "Risk assessments"],
      retention: "1 year"
    },
    healthDataProcessing: {
      title: "Health Data Processing",
      description: "Process sensitive health data for fitness and nutrition insights",
      requiredFor: "Progress tracking and health analytics",
      dataTypes: ["Body measurements", "Progress photos", "Health metrics"],
      retention: "7 years (health data regulation)",
      specialCategory: true
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          Privacy & Consent Settings
        </CardTitle>
        <CardDescription>
          Control how your data is used for analytics and personalization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(consentDescriptions).map(([key, desc]) => (
          <ConsentSection
            key={key}
            consentKey={key as keyof ConsentPreferences}
            description={desc}
            consent={consent}
            onChange={setConsent}
          />
        ))}

        <Separator />

        {/* Data Retention Preferences */}
        <div className="space-y-3">
          <h4 className="font-medium">Data Retention Period</h4>
          <p className="text-sm text-muted-foreground">
            Choose how long we keep your analytics data
          </p>
          <Select
            value={consent.dataRetentionPeriod.toString()}
            onValueChange={(value) => setConsent(prev => ({
              ...prev,
              dataRetentionPeriod: parseInt(value)
            }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90">3 months</SelectItem>
              <SelectItem value="180">6 months</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
              <SelectItem value="730">2 years</SelectItem>
              <SelectItem value="1095">3 years</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button variant="outline" onClick={downloadDataExport}>
            <Download className="h-4 w-4 mr-2" />
            Download My Data
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button onClick={saveConsentPreferences}>
              Save Preferences
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ConsentSection: React.FC<{
  consentKey: keyof ConsentPreferences;
  description: any;
  consent: ConsentPreferences;
  onChange: (consent: ConsentPreferences) => void;
}> = ({ consentKey, description, consent, onChange }) => {
  const isEnabled = consent[consentKey] as boolean;

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium">{description.title}</h4>
            {description.specialCategory && (
              <Badge variant="destructive" className="text-xs">Sensitive Data</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description.description}</p>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Required for:</span> {description.requiredFor}
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => onChange({
            ...consent,
            [consentKey]: checked,
            lastUpdated: new Date()
          })}
        />
      </div>

      {isEnabled && (
        <Collapsible>
          <CollapsibleTrigger className="text-xs text-primary hover:underline">
            Show data details
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-xs text-muted-foreground space-y-1">
            <div><span className="font-medium">Data types:</span> {description.dataTypes.join(", ")}</div>
            <div><span className="font-medium">Retention:</span> {description.retention}</div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
```

---

## **🔐 DATA PROCESSING CONTROLS**

### **Consent-Aware Data Processing**

```typescript
// server/middleware/consentEnforcement.ts
export class ConsentEnforcer {
  static async checkConsentForAnalytics(
    userId: string,
    requiredConsent: ConsentType[]
  ): Promise<boolean> {
    const userConsent = await getAnalyticsPrivacyPreferences(userId);

    return requiredConsent.every(consent => {
      switch (consent) {
        case ConsentType.ANALYTICS:
          return userConsent.allowUsageAnalytics;
        case ConsentType.BEHAVIORAL_ANALYSIS:
          return userConsent.allowBehavioralAnalysis;
        case ConsentType.PREDICTIVE_MODELING:
          return userConsent.allowPredictiveModeling;
        case ConsentType.HEALTH_DATA_PROCESSING:
          return userConsent.allowHealthDataProcessing;
        default:
          return false;
      }
    });
  }

  static async filterDataByConsent<T>(
    userId: string,
    data: T[],
    dataClassification: DataElement[]
  ): Promise<Partial<T>[]> {
    const userConsent = await getAnalyticsPrivacyPreferences(userId);

    return data.map(item => {
      const filteredItem: Partial<T> = {};

      Object.keys(item as object).forEach(key => {
        const classification = dataClassification.find(d => d.field === key);

        if (!classification) {
          // Allow non-classified data
          (filteredItem as any)[key] = (item as any)[key];
          return;
        }

        // Check if user has consented to this data type
        const hasConsent = classification.requiredConsent.every(consent =>
          ConsentEnforcer.checkConsentType(userConsent, consent)
        );

        if (hasConsent) {
          (filteredItem as any)[key] = (item as any)[key];
        } else if (classification.anonymizable) {
          // Anonymize data if possible
          (filteredItem as any)[key] = ConsentEnforcer.anonymizeValue(
            (item as any)[key],
            classification.category
          );
        }
        // Otherwise, exclude the field entirely
      });

      return filteredItem;
    });
  }

  private static checkConsentType(
    userConsent: AnalyticsPrivacyPreferences,
    consentType: ConsentType
  ): boolean {
    switch (consentType) {
      case ConsentType.ANALYTICS:
        return userConsent.allowUsageAnalytics;
      case ConsentType.BEHAVIORAL_ANALYSIS:
        return userConsent.allowBehavioralAnalysis;
      case ConsentType.PREDICTIVE_MODELING:
        return userConsent.allowPredictiveModeling;
      case ConsentType.HEALTH_DATA_PROCESSING:
        return userConsent.allowHealthDataProcessing;
      default:
        return false;
    }
  }

  private static anonymizeValue(value: any, category: DataCategory): any {
    switch (category) {
      case DataCategory.IDENTITY:
        return typeof value === 'string' ? '***ANONYMIZED***' : null;
      case DataCategory.CONTACT:
        return typeof value === 'string' ? value.replace(/./g, '*') : null;
      case DataCategory.BEHAVIORAL:
        return typeof value === 'number' ? Math.round(value / 10) * 10 : null;
      case DataCategory.HEALTH:
        return null; // Health data cannot be anonymized, must be excluded
      default:
        return value;
    }
  }
}

// Middleware for analytics endpoints
export const enforceAnalyticsConsent = (requiredConsent: ConsentType[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as AuthenticatedRequest;

    const hasConsent = await ConsentEnforcer.checkConsentForAnalytics(
      user.id,
      requiredConsent
    );

    if (!hasConsent) {
      return res.status(403).json({
        error: 'Insufficient consent for this analytics feature',
        requiredConsent,
        consentUrl: '/privacy/consent'
      });
    }

    next();
  };
};
```

---

## **🗂️ DATA SUBJECT RIGHTS IMPLEMENTATION**

### **GDPR Rights Management**

```typescript
// server/services/dataSubjectRights.ts
export class DataSubjectRightsService {

  // Right of Access (Article 15 GDPR)
  static async generateDataExport(userId: string): Promise<DataExportResult> {
    const exportData = {
      personalData: await this.getPersonalData(userId),
      analyticsData: await this.getAnalyticsData(userId),
      consentHistory: await this.getConsentHistory(userId),
      dataProcessingActivities: await this.getProcessingActivities(userId)
    };

    const exportFile = await this.createExportFile(exportData);

    // Log the access request
    await this.logDataAccess(userId, 'data_export');

    return {
      exportId: uuidv4(),
      downloadUrl: exportFile.url,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      fileSize: exportFile.size,
      dataTypes: Object.keys(exportData)
    };
  }

  // Right to Rectification (Article 16 GDPR)
  static async rectifyData(userId: string, corrections: DataCorrection[]): Promise<void> {
    for (const correction of corrections) {
      await this.validateCorrection(correction);
      await this.applyCorrection(userId, correction);
      await this.logDataRectification(userId, correction);
    }

    // Notify affected analytics systems
    await this.invalidateAnalyticsCache(userId);
  }

  // Right to Erasure (Article 17 GDPR)
  static async eraseUserData(
    userId: string,
    erasureType: 'complete' | 'analytics_only' | 'selective',
    specificData?: string[]
  ): Promise<ErasureResult> {
    const erasureLog = await this.createErasureLog(userId, erasureType);

    try {
      switch (erasureType) {
        case 'complete':
          await this.completeErasure(userId);
          break;
        case 'analytics_only':
          await this.eraseAnalyticsData(userId);
          break;
        case 'selective':
          await this.selectiveErasure(userId, specificData!);
          break;
      }

      await this.updateErasureLog(erasureLog.id, 'completed');
      return { success: true, erasureId: erasureLog.id };

    } catch (error) {
      await this.updateErasureLog(erasureLog.id, 'failed', error.message);
      throw error;
    }
  }

  // Right to Data Portability (Article 20 GDPR)
  static async generatePortabilityExport(
    userId: string,
    format: 'json' | 'csv' | 'xml'
  ): Promise<PortabilityExport> {
    const portableData = await this.getPortableData(userId);
    const exportFile = await this.createPortabilityFile(portableData, format);

    return {
      exportId: uuidv4(),
      format,
      downloadUrl: exportFile.url,
      schema: this.getDataSchema(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }

  // Right to Object (Article 21 GDPR)
  static async processObjection(
    userId: string,
    objectionType: ObjectionType,
    processingActivity: string,
    reason?: string
  ): Promise<void> {
    const objection = await this.createObjection({
      userId,
      objectionType,
      processingActivity,
      reason,
      timestamp: new Date()
    });

    switch (objectionType) {
      case ObjectionType.PROFILING:
        await this.disableProfiling(userId);
        break;
      case ObjectionType.DIRECT_MARKETING:
        await this.disableMarketing(userId);
        break;
      case ObjectionType.ANALYTICS:
        await this.disableAnalytics(userId);
        break;
      case ObjectionType.AUTOMATED_DECISION_MAKING:
        await this.disableAutomatedDecisions(userId);
        break;
    }

    // Notify user of objection processing
    await this.sendObjectionConfirmation(userId, objection);
  }

  // Data Breach Notification (Article 33-34 GDPR)
  static async handleDataBreach(breach: DataBreach): Promise<void> {
    // Assess breach severity
    const riskAssessment = await this.assessBreachRisk(breach);

    // Log the breach
    const breachLog = await this.logDataBreach(breach, riskAssessment);

    // If high risk, notify supervisory authority within 72 hours
    if (riskAssessment.riskLevel === 'high') {
      await this.notifySupervisoryAuthority(breachLog);
    }

    // If affecting individual rights, notify data subjects
    if (riskAssessment.notifyDataSubjects) {
      await this.notifyAffectedUsers(breach.affectedUsers, breach);
    }

    // Implement breach containment measures
    await this.implementBreachContainment(breach);
  }

  private static async getAnalyticsData(userId: string): Promise<any> {
    const userConsent = await getAnalyticsPrivacyPreferences(userId);

    // Only include data that user has consented to
    const analyticsData: any = {};

    if (userConsent.allowUsageAnalytics) {
      analyticsData.engagementMetrics = await this.getEngagementData(userId);
    }

    if (userConsent.allowBehavioralAnalysis) {
      analyticsData.behaviorPatterns = await this.getBehaviorData(userId);
    }

    if (userConsent.allowPredictiveModeling) {
      analyticsData.predictions = await this.getPredictionData(userId);
    }

    return analyticsData;
  }
}

enum ObjectionType {
  PROFILING = 'profiling',
  DIRECT_MARKETING = 'direct_marketing',
  ANALYTICS = 'analytics',
  AUTOMATED_DECISION_MAKING = 'automated_decision_making'
}

interface DataBreach {
  id: string;
  type: 'confidentiality' | 'integrity' | 'availability';
  affectedData: string[];
  affectedUsers: string[];
  discoveredAt: Date;
  containedAt?: Date;
  cause: string;
  impact: string;
}
```

---

## **📊 PRIVACY MONITORING & AUDITING**

### **Continuous Compliance Monitoring**

```typescript
// server/services/complianceMonitoring.ts
export class ComplianceMonitor {

  // Monitor consent validity
  static async auditConsentCompliance(): Promise<ComplianceReport> {
    const issues: ComplianceIssue[] = [];

    // Check for expired consents
    const expiredConsents = await this.findExpiredConsents();
    if (expiredConsents.length > 0) {
      issues.push({
        type: 'expired_consent',
        severity: 'high',
        count: expiredConsents.length,
        description: 'Users with expired consent still in analytics processing'
      });
    }

    // Check for processing without consent
    const unauthorizedProcessing = await this.findUnauthorizedProcessing();
    if (unauthorizedProcessing.length > 0) {
      issues.push({
        type: 'unauthorized_processing',
        severity: 'critical',
        count: unauthorizedProcessing.length,
        description: 'Analytics processing without valid consent'
      });
    }

    // Check data retention compliance
    const retentionViolations = await this.findRetentionViolations();
    if (retentionViolations.length > 0) {
      issues.push({
        type: 'retention_violation',
        severity: 'high',
        count: retentionViolations.length,
        description: 'Data retained beyond user-specified periods'
      });
    }

    return {
      timestamp: new Date(),
      overallStatus: issues.length === 0 ? 'compliant' : 'issues_found',
      issues,
      recommendations: this.generateRecommendations(issues)
    };
  }

  // Automated data retention cleanup
  static async performRetentionCleanup(): Promise<CleanupResult> {
    const cleanupActions: CleanupAction[] = [];

    // Find data past retention period
    const expiredData = await this.findExpiredData();

    for (const data of expiredData) {
      if (data.classification === DataClassification.HIGHLY_RESTRICTED) {
        // Secure deletion for sensitive data
        await this.secureDelete(data);
        cleanupActions.push({
          type: 'secure_delete',
          dataType: data.type,
          recordCount: data.count
        });
      } else if (data.anonymizable) {
        // Anonymize non-sensitive data
        await this.anonymizeData(data);
        cleanupActions.push({
          type: 'anonymize',
          dataType: data.type,
          recordCount: data.count
        });
      } else {
        // Regular deletion
        await this.deleteData(data);
        cleanupActions.push({
          type: 'delete',
          dataType: data.type,
          recordCount: data.count
        });
      }
    }

    return {
      timestamp: new Date(),
      actionsPerformed: cleanupActions,
      totalRecordsProcessed: cleanupActions.reduce((sum, action) => sum + action.recordCount, 0)
    };
  }

  // Privacy impact assessment automation
  static async conductPrivacyImpactAssessment(
    feature: string,
    dataProcessing: DataProcessingActivity
  ): Promise<PrivacyImpactAssessment> {
    const assessment = {
      feature,
      dataProcessing,
      riskLevel: 'low' as 'low' | 'medium' | 'high',
      risks: [] as PrivacyRisk[],
      mitigationMeasures: [] as MitigationMeasure[],
      complianceStatus: 'compliant' as 'compliant' | 'non_compliant' | 'review_required'
    };

    // Assess data sensitivity
    if (dataProcessing.involvesSensitiveData) {
      assessment.riskLevel = 'high';
      assessment.risks.push({
        type: 'sensitive_data_processing',
        description: 'Processing involves sensitive personal data',
        impact: 'high',
        likelihood: 'medium'
      });
    }

    // Assess profiling and automated decision making
    if (dataProcessing.involvesProfiling) {
      assessment.riskLevel = 'medium';
      assessment.risks.push({
        type: 'profiling',
        description: 'Feature involves automated profiling',
        impact: 'medium',
        likelihood: 'high'
      });
    }

    // Generate mitigation measures
    assessment.mitigationMeasures = this.generateMitigationMeasures(assessment.risks);

    return assessment;
  }
}

interface ComplianceIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  description: string;
}

interface DataProcessingActivity {
  purpose: string;
  dataTypes: string[];
  legalBasis: LegalBasis;
  involvesSensitiveData: boolean;
  involvesProfiling: boolean;
  automatedDecisionMaking: boolean;
  dataRetentionPeriod: number;
}
```

---

## **📋 COMPLIANCE DASHBOARD**

```typescript
// client/src/components/admin/ComplianceDashboard.tsx
const ComplianceDashboard: React.FC = () => {
  const [complianceStatus, setComplianceStatus] = useState<ComplianceReport | null>(null);
  const [dataRequests, setDataRequests] = useState<DataSubjectRequest[]>([]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Privacy Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {complianceStatus?.overallStatus === 'compliant' ? '✓' : '⚠'}
              </div>
              <div className="text-sm text-muted-foreground">Overall Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{dataRequests.length}</div>
              <div className="text-sm text-muted-foreground">Pending Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">99.2%</div>
              <div className="text-sm text-muted-foreground">Consent Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">24h</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Subject Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Data Subject Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <DataSubjectRequestsTable requests={dataRequests} />
        </CardContent>
      </Card>

      {/* Compliance Issues */}
      {complianceStatus?.issues && complianceStatus.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Compliance Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <ComplianceIssuesList issues={complianceStatus.issues} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

This comprehensive privacy compliance framework provides:

1. **GDPR/CCPA Compliance** - Complete implementation of data subject rights
2. **Granular Consent Management** - Tier-aware consent for different analytics features
3. **Data Classification** - Systematic classification and protection of personal data
4. **Automated Compliance Monitoring** - Continuous monitoring and alerting
5. **Privacy-by-Design** - Built-in privacy controls at the data processing level
6. **Audit Trail** - Complete logging of all privacy-related activities

The framework ensures that the analytics system respects user privacy while providing valuable insights to trainers based on their subscription tier and user consent.