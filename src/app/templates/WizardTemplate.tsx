import React, { useState } from 'react';
import { Box, Typography, Button, Section } from '@/components/atoms';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<any>;
  validate?: (data: any) => Promise<boolean> | boolean;
  optional?: boolean;
}

export interface WizardTemplateProps {
  title: string;
  steps: WizardStep[];
  onComplete: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
  showStepNumbers?: boolean;
  allowSkip?: boolean;
  saveProgress?: boolean;
  onSaveProgress?: (data: any, currentStep: number) => void;
}

export const WizardTemplate: React.FC<WizardTemplateProps> = ({
  title,
  steps,
  onComplete,
  onCancel,
  initialData = {},
  showStepNumbers = true,
  allowSkip = false,
  saveProgress = false,
  onSaveProgress,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [wizardData, setWizardData] = useState(initialData);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  const StepComponent = currentStep.component;

  const handleNext = async () => {
    setValidationError(null);

    if (currentStep.validate) {
      setIsValidating(true);
      try {
        const isValid = await currentStep.validate(wizardData);
        if (!isValid) {
          setValidationError('Please complete all required fields');
          setIsValidating(false);
          return;
        }
      } catch (error: any) {
        setValidationError(error.message || 'Validation failed');
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    if (saveProgress && onSaveProgress) {
      onSaveProgress(wizardData, currentStepIndex + 1);
    }

    if (isLastStep) {
      onComplete(wizardData);
    } else {
      setCurrentStepIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setValidationError(null);
      setCurrentStepIndex(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSkip = () => {
    if (currentStep.optional && allowSkip) {
      setCurrentStepIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleStepClick = (index: number) => {
    if (index < currentStepIndex) {
      setValidationError(null);
      setCurrentStepIndex(index);
      window.scrollTo(0, 0);
    }
  };

  const updateWizardData = (data: any) => {
    setWizardData(data);
  };

  const completedSteps = currentStepIndex;
  const progressPercentage = ((completedSteps) / steps.length) * 100;

  return (
    <Box className="wizard-template" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <Box style={{ marginBottom: '32px' }}>
        <Typography variant="h1" style={{ marginBottom: '8px' }}>
          {title}
        </Typography>
        <Typography variant="body" style={{ color: '#6b7280' }}>
          Step {currentStepIndex + 1} of {steps.length}
        </Typography>
      </Box>

      {/* Progress Bar */}
      <Box style={{
        height: '4px',
        backgroundColor: '#e5e7eb',
        borderRadius: '2px',
        marginBottom: '32px',
        overflow: 'hidden'
      }}>
        <Box style={{
          height: '100%',
          backgroundColor: '#3b82f6',
          width: `${progressPercentage}%`,
          transition: 'width 0.3s ease'
        }} />
      </Box>

      {/* Step Indicator */}
      <Box style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '32px',
        gap: '8px'
      }}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isClickable = index < currentStepIndex;

          return (
            <Box
              key={step.id}
              onClick={() => isClickable && handleStepClick(index)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: isClickable ? 'pointer' : 'default',
                opacity: isCompleted || isCurrent ? 1 : 0.5
              }}
            >
              {showStepNumbers && (
                <Box style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isCompleted ? '#10b981' : isCurrent ? '#3b82f6' : '#e5e7eb',
                  color: isCompleted || isCurrent ? 'white' : '#6b7280',
                  fontWeight: 600,
                  fontSize: '14px'
                }}>
                  {isCompleted ? '✓' : index + 1}
                </Box>
              )}
              <Typography
                variant="caption"
                style={{
                  textAlign: 'center',
                  color: isCurrent ? '#1f2937' : '#6b7280',
                  fontWeight: isCurrent ? 600 : 400,
                  fontSize: '12px'
                }}
              >
                {step.title}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Current Step Content */}
      <Section style={{ marginBottom: '24px' }}>
        <Box style={{ marginBottom: '24px' }}>
          <Typography variant="h2" style={{ marginBottom: '8px' }}>
            {currentStep.title}
          </Typography>
          {currentStep.description && (
            <Typography variant="body" style={{ color: '#6b7280' }}>
              {currentStep.description}
            </Typography>
          )}
        </Box>

        {validationError && (
          <Box style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            {validationError}
          </Box>
        )}

        <StepComponent
          data={wizardData}
          updateData={updateWizardData}
        />
      </Section>

      {/* Navigation */}
      <Box style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        position: 'sticky',
        bottom: '0'
      }}>
        <Box>
          {!isFirstStep && (
            <Button variant="secondary" onClick={handleBack}>
              ← Back
            </Button>
          )}
          {isFirstStep && onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Box>

        <Box style={{ display: 'flex', gap: '12px' }}>
          {currentStep.optional && allowSkip && !isLastStep && (
            <Button variant="text" onClick={handleSkip}>
              Skip
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={isValidating}
          >
            {isValidating ? 'Validating...' : isLastStep ? 'Complete' : 'Next →'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
