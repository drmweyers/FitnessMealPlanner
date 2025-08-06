/**
 * Medical Disclaimer Modal Component
 * 
 * This component provides comprehensive medical disclaimers and consent tracking
 * for specialized health protocols including longevity and parasite cleanse features.
 * Ensures user safety by requiring acknowledgment of risks and medical supervision requirements.
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  AlertTriangle,
  Shield,
  Heart,
  Baby,
  Pill,
  FileText,
  CheckCircle,
  User,
  Clock,
  Info,
} from 'lucide-react';
import type {
  MedicalDisclaimer,
  MedicalDisclaimerModalProps,
} from '../types/specializedProtocols';

// Validation schema for consent form
const medicalConsentSchema = z.object({
  hasReadDisclaimer: z.boolean().refine(val => val === true, {
    message: 'You must read and acknowledge the medical disclaimer',
  }),
  acknowledgedRisks: z.boolean().refine(val => val === true, {
    message: 'You must acknowledge the potential risks',
  }),
  hasHealthcareProviderApproval: z.boolean().refine(val => val === true, {
    message: 'Healthcare provider consultation is required',
  }),
  pregnancyScreeningComplete: z.boolean().refine(val => val === true, {
    message: 'Pregnancy screening must be completed',
  }),
  medicalConditionsScreened: z.boolean().refine(val => val === true, {
    message: 'Medical conditions screening must be completed',
  }),
  notPregnantOrNursing: z.boolean(),
  noMedicalConditions: z.boolean(),
  notTakingMedications: z.boolean(),
  over18Years: z.boolean().refine(val => val === true, {
    message: 'You must be over 18 years old',
  }),
});

interface ConsentFormData {
  hasReadDisclaimer: boolean;
  acknowledgedRisks: boolean;
  hasHealthcareProviderApproval: boolean;
  pregnancyScreeningComplete: boolean;
  medicalConditionsScreened: boolean;
  notPregnantOrNursing: boolean;
  noMedicalConditions: boolean;
  notTakingMedications: boolean;
  over18Years: boolean;
}

// Protocol-specific disclaimers
const PROTOCOL_DISCLAIMERS = {
  longevity: {
    title: 'Longevity Protocol Medical Disclaimer',
    icon: <Clock className="w-5 h-5 text-blue-600" />,
    risks: [
      'Intermittent fasting may cause fatigue, dizziness, or mood changes',
      'Calorie restriction can lead to nutritional deficiencies if not properly managed',
      'May interact with diabetes medications or blood pressure medications',
      'Not suitable for individuals with eating disorders or history of disordered eating',
      'May affect energy levels and physical performance',
    ],
    contraindications: [
      'Pregnancy or breastfeeding',
      'Type 1 diabetes',
      'History of eating disorders',
      'Underweight (BMI < 18.5)',
      'Taking medications that require food',
      'Chronic kidney or liver disease',
    ],
    requirements: [
      'Consultation with healthcare provider before starting',
      'Regular monitoring of energy levels and well-being',
      'Gradual implementation of fasting protocols',
      'Adequate nutrient intake during eating windows',
    ],
  },
  'parasite-cleanse': {
    title: 'Parasite Cleanse Protocol Medical Disclaimer',
    icon: <Shield className="w-5 h-5 text-orange-600" />,
    risks: [
      'Herbal supplements may cause digestive upset or allergic reactions',
      'Detox reactions may include fatigue, headaches, or skin changes',
      'May interact with medications or exacerbate certain conditions',
      'Intensive protocols can cause significant digestive disturbance',
      'Possible Herxheimer reaction (temporary symptom worsening)',
    ],
    contraindications: [
      'Pregnancy or breastfeeding',
      'Inflammatory bowel disease (IBD)',
      'Severe digestive disorders',
      'Immunocompromised conditions',
      'Taking blood thinners or immunosuppressants',
      'Recent surgery or serious illness',
    ],
    requirements: [
      'Healthcare provider supervision, especially for intensive protocols',
      'Gradual introduction of cleansing foods and herbs',
      'Monitoring for adverse reactions',
      'Adequate hydration and electrolyte balance',
      'Stop immediately if severe symptoms occur',
    ],
  },
};

const GENERAL_SCREENING_QUESTIONS = [
  {
    key: 'pregnancyScreeningComplete',
    label: 'Pregnancy/Nursing Status',
    description: 'I confirm that I am not pregnant, planning to become pregnant, or nursing',
    icon: <Baby className="w-4 h-4 text-pink-600" />,
    required: true,
  },
  {
    key: 'medicalConditionsScreened',
    label: 'Medical Conditions',
    description: 'I have disclosed all medical conditions and consulted my healthcare provider',
    icon: <Heart className="w-4 h-4 text-red-600" />,
    required: true,
  },
  {
    key: 'over18Years',
    label: 'Age Verification',
    description: 'I confirm that I am 18 years of age or older',
    icon: <User className="w-4 h-4 text-gray-600" />,
    required: true,
  },
];

const MedicalDisclaimerModal: React.FC<MedicalDisclaimerModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  protocolType,
  requiredScreenings,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const form = useForm<ConsentFormData>({
    resolver: zodResolver(medicalConsentSchema),
    defaultValues: {
      hasReadDisclaimer: false,
      acknowledgedRisks: false,
      hasHealthcareProviderApproval: false,
      pregnancyScreeningComplete: false,
      medicalConditionsScreened: false,
      notPregnantOrNursing: false,
      noMedicalConditions: false,
      notTakingMedications: false,
      over18Years: false,
    },
  });

  const protocolInfo = PROTOCOL_DISCLAIMERS[protocolType];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAccept = (data: ConsentFormData) => {
    const disclaimer: MedicalDisclaimer = {
      hasReadDisclaimer: data.hasReadDisclaimer,
      hasConsented: true,
      consentTimestamp: new Date(),
      acknowledgedRisks: data.acknowledgedRisks,
      hasHealthcareProviderApproval: data.hasHealthcareProviderApproval,
      pregnancyScreeningComplete: data.pregnancyScreeningComplete,
      medicalConditionsScreened: data.medicalConditionsScreened,
    };
    
    onAccept(disclaimer);
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                {protocolInfo.icon}
                <h3 className="text-lg font-semibold">{protocolInfo.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Please read this important medical information carefully
              </p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not Medical Advice</AlertTitle>
              <AlertDescription>
                This protocol is for educational and informational purposes only. It is not intended 
                to diagnose, treat, cure, or prevent any disease. Always consult with a qualified 
                healthcare professional before making any changes to your diet, lifestyle, or health regimen.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Potential Risks & Side Effects
                </Label>
                <ul className="mt-2 text-sm space-y-1 text-muted-foreground">
                  {protocolInfo.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Label className="text-base font-medium text-amber-600 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Contraindications (Do NOT Use If)
                </Label>
                <ul className="mt-2 text-sm space-y-1 text-muted-foreground">
                  {protocolInfo.contraindications.map((condition, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <Label className="text-base font-medium text-blue-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Requirements & Recommendations
                </Label>
                <ul className="mt-2 text-sm space-y-1 text-muted-foreground">
                  {protocolInfo.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      {requirement}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <FormField
              control={form.control}
              name="hasReadDisclaimer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 p-4 border rounded-lg">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="grid gap-1.5 leading-none">
                    <FormLabel>
                      I have read and understood the medical information above
                    </FormLabel>
                    <FormDescription>
                      This includes all risks, contraindications, and requirements
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Medical Screening</h3>
              <p className="text-sm text-muted-foreground">
                Please complete this screening to ensure your safety
              </p>
            </div>

            <div className="space-y-4">
              {GENERAL_SCREENING_QUESTIONS.map((question) => (
                <FormField
                  key={question.key}
                  control={form.control}
                  name={question.key as keyof ConsentFormData}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-lg">
                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="grid gap-1.5 leading-none">
                        <div className="flex items-center gap-2">
                          {question.icon}
                          <FormLabel>{question.label}</FormLabel>
                          {question.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                        </div>
                        <FormDescription>{question.description}</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              ))}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Healthcare Provider Consultation</AlertTitle>
                <AlertDescription>
                  Due to the nature of this protocol, consultation with a healthcare provider is required 
                  before beginning. This is especially important if you have any medical conditions, 
                  take medications, or have concerns about your health.
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="hasHealthcareProviderApproval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="grid gap-1.5 leading-none">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <FormLabel className="font-medium">Healthcare Provider Approval</FormLabel>
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </div>
                      <FormDescription>
                        I have consulted with my healthcare provider and received approval to begin this protocol
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Final Consent</h3>
              <p className="text-sm text-muted-foreground">
                Please review and provide final consent
              </p>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Consent Summary</AlertTitle>
              <AlertDescription>
                By proceeding, you acknowledge that you have read and understood all medical information, 
                completed the health screening, and received healthcare provider approval for this protocol.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="acknowledgedRisks"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-lg">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="grid gap-1.5 leading-none">
                      <FormLabel>Risk Acknowledgment</FormLabel>
                      <FormDescription>
                        I acknowledge and accept the potential risks and side effects of this protocol
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="p-4 bg-muted rounded-lg">
                <Label className="text-sm font-medium">Legal Disclaimer</Label>
                <p className="text-xs text-muted-foreground mt-2">
                  This application and its recommendations are not intended to replace professional medical advice, 
                  diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider 
                  with any questions you may have regarding a medical condition. Never disregard professional medical 
                  advice or delay in seeking it because of something you have read in this application.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Medical Disclaimer & Consent
          </DialogTitle>
          <DialogDescription>
            Step {currentStep} of {totalSteps} - Please read carefully and provide consent
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAccept)}>
              {renderStepContent()}
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i + 1 <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={!form.watch('hasReadDisclaimer') && currentStep === 1}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                onClick={form.handleSubmit(handleAccept)}
                disabled={!form.formState.isValid}
                className="bg-green-600 hover:bg-green-700"
              >
                I Consent & Agree
              </Button>
            )}

            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MedicalDisclaimerModal;