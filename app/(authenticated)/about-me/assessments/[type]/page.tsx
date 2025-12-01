"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Target,
  Star,
  Shield,
  Zap,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getQuestionsForType, PROFESSIONAL_SKILLS, type AssessmentQuestions } from "@/lib/assessments/questions";

// Simple progress bar component
function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("w-full bg-[#E8DCC4] rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-[#5C7A6B] transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ============================================================================
// Types
// ============================================================================

type AssessmentType = 'values_alignment' | 'strengths' | 'self_compassion' | 'executive_function';

interface AssessmentConfig {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  totalQuestions: number;
  instructions: string[];
}

const ASSESSMENT_CONFIGS: Record<AssessmentType, AssessmentConfig> = {
  executive_function: {
    title: 'Executive Function Assessment',
    description: '12 skills x 3 questions each = 36 questions',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    totalQuestions: 36,
    instructions: [
      'This assessment measures 12 executive function skills based on the Dawson framework.',
      'For each question, rate yourself from 1 (rarely/never) to 7 (always/consistently).',
      'Answer honestly based on your typical behavior, not your best or worst days.',
      'There are no right or wrong answers - this is about self-awareness.',
    ],
  },
  self_compassion: {
    title: 'Self-Compassion Scale',
    description: '26 questions measuring self-kindness, mindfulness, and common humanity',
    icon: Shield,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    totalQuestions: 26,
    instructions: [
      'Developed by Dr. Kristin Neff, this measures how you typically treat yourself during difficult times.',
      'For each statement, rate how often you behave this way from 1 (almost never) to 5 (almost always).',
      'Answer based on your typical patterns, not how you think you "should" respond.',
      'Some questions measure positive traits, others measure negative patterns - answer honestly for both.',
    ],
  },
  strengths: {
    title: 'Professional Skills',
    description: '16 skills rated on Proficiency and Energy',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    totalQuestions: 16,
    instructions: [
      'Rate 16 professional skills across 4 categories: Leading, Relating, Executing, and Creating.',
      'For each skill, you\'ll rate two dimensions:',
      '• Proficiency: How skilled you are (1 = Novice, 5 = Expert)',
      '• Energy: How much it energizes you (1 = Draining, 5 = Energizing)',
      'Your ratings place each skill into one of four quadrants: Strengths, Growth Opportunities, Learned Behaviors, or Delegate/Develop.',
    ],
  },
  values_alignment: {
    title: 'Values Alignment',
    description: 'Identify your 3 core values and what living aligned looks like',
    icon: Target,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    totalQuestions: 10,
    instructions: [
      'Based on Brene Brown\'s values work from Dare to Lead.',
      'You\'ll select your top 3 core values from a list of options.',
      'For each value, you\'ll describe:',
      '• Supporting behaviors (how you live this value well)',
      '• Slippery behaviors (how you fall away from this value)',
      '• A "Living Into" example (a concrete way you embody it)',
      'You\'ll also identify early warning signs and support systems.',
    ],
  },
};

// ============================================================================
// Main Component
// ============================================================================

export default function AssessmentWizardPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as AssessmentType;

  const [step, setStep] = useState<'intro' | 'questions' | 'review' | 'complete'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number | string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = ASSESSMENT_CONFIGS[type];

  if (!config) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-medium text-[#1E3D32] mb-2">
            Assessment Not Found
          </h1>
          <p className="text-[#5C7A6B] mb-4">
            The assessment type "{type}" doesn't exist.
          </p>
          <Button onClick={() => router.push('/about-me/assessments')}>
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  const Icon = config.icon;
  const progress = step === 'intro' ? 0 :
                   step === 'questions' ? ((currentQuestion + 1) / config.totalQuestions) * 100 :
                   step === 'review' ? 90 : 100;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/about-me/assessments"
            className="inline-flex items-center gap-1 text-sm text-[#8B9A8F] hover:text-[#5C7A6B] mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </Link>

          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-lg", config.bgColor)}>
              <Icon className={cn("h-6 w-6", config.color)} />
            </div>
            <div>
              <h1 className="text-xl font-serif text-[#1E3D32]">
                {config.title}
              </h1>
              <p className="text-sm text-[#5C7A6B]">
                {config.description}
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-[#8B9A8F] mb-2">
            <span>
              {step === 'intro' && 'Introduction'}
              {step === 'questions' && `Question ${currentQuestion + 1} of ${config.totalQuestions}`}
              {step === 'review' && 'Review'}
              {step === 'complete' && 'Complete'}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} className="h-2" />
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-[#E8DCC4] p-6 shadow-sm">
          {step === 'intro' && (
            <IntroStep
              config={config}
              onStart={() => setStep('questions')}
            />
          )}

          {step === 'questions' && type === 'strengths' ? (
            <StrengthsQuestionStep
              questionIndex={currentQuestion}
              totalQuestions={config.totalQuestions}
              responses={responses}
              onResponse={(key, value) => {
                setResponses(prev => ({ ...prev, [key]: value }));
              }}
              onNext={() => {
                if (currentQuestion < config.totalQuestions - 1) {
                  setCurrentQuestion(prev => prev + 1);
                } else {
                  setStep('review');
                }
              }}
              onBack={() => {
                if (currentQuestion > 0) {
                  setCurrentQuestion(prev => prev - 1);
                } else {
                  setStep('intro');
                }
              }}
            />
          ) : step === 'questions' && (
            <QuestionStep
              type={type}
              questionIndex={currentQuestion}
              totalQuestions={config.totalQuestions}
              responses={responses}
              onResponse={(value) => {
                setResponses(prev => ({ ...prev, [`q${currentQuestion}`]: value }));
              }}
              onNext={() => {
                if (currentQuestion < config.totalQuestions - 1) {
                  setCurrentQuestion(prev => prev + 1);
                } else {
                  setStep('review');
                }
              }}
              onBack={() => {
                if (currentQuestion > 0) {
                  setCurrentQuestion(prev => prev - 1);
                } else {
                  setStep('intro');
                }
              }}
            />
          )}

          {step === 'review' && (
            <ReviewStep
              type={type}
              responses={responses}
              totalQuestions={config.totalQuestions}
              isSubmitting={isSubmitting}
              error={error}
              onEdit={() => {
                setStep('questions');
                setCurrentQuestion(0);
              }}
              onSubmit={async () => {
                setIsSubmitting(true);
                setError(null);

                try {
                  // Transform strengths responses from flat keys to skill-keyed format
                  let formattedResponses = responses;
                  if (type === 'strengths') {
                    const skillResponses: Record<string, { p: number; e: number }> = {};
                    PROFESSIONAL_SKILLS.forEach((skill, i) => {
                      const prof = responses[`q${i}_prof`];
                      const energy = responses[`q${i}_energy`];
                      if (prof !== undefined && energy !== undefined) {
                        skillResponses[skill.name] = {
                          p: Number(prof),
                          e: Number(energy),
                        };
                      }
                    });
                    formattedResponses = skillResponses as unknown as Record<string, number | string>;
                  }

                  const response = await fetch('/api/assessments/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type,
                      responses: formattedResponses,
                      date: new Date().toISOString().split('T')[0],
                    }),
                  });

                  if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to submit');
                  }

                  setStep('complete');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to submit assessment. Please try again.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
            />
          )}

          {step === 'complete' && (
            <CompleteStep
              config={config}
              onViewResults={() => router.push('/about-me/assessments')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

function IntroStep({
  config,
  onStart,
}: {
  config: AssessmentConfig;
  onStart: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-[#1E3D32] mb-4">
          Before You Begin
        </h2>
        <ul className="space-y-3">
          {config.instructions.map((instruction, i) => (
            <li key={i} className="flex items-start gap-3 text-[#5C7A6B]">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F5F0E6] flex items-center justify-center text-xs text-[#5C7A6B]">
                {i + 1}
              </span>
              <span>{instruction}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Estimated time:</strong> This assessment takes approximately {
            config.totalQuestions <= 26 ? '8-10' :
            config.totalQuestions <= 36 ? '10-15' :
            '25-30'
          } minutes to complete.
        </p>
      </div>

      <Button
        onClick={onStart}
        className="w-full bg-[#5C7A6B] text-white hover:bg-[#4A6859]"
      >
        Start Assessment
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

function QuestionStep({
  type,
  questionIndex,
  totalQuestions,
  responses,
  onResponse,
  onNext,
  onBack,
}: {
  type: AssessmentType;
  questionIndex: number;
  totalQuestions: number;
  responses: Record<string, number | string>;
  onResponse: (value: number | string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const currentResponse = responses[`q${questionIndex}`];

  // Load questions from the questions library
  const questionData = getQuestionsForType(type);

  // Get scale config from question data or fallback
  const scale = questionData?.scale || {
    min: 1,
    max: 5,
    labels: ['1', '2', '3', '4', '5'],
  };

  // Get current question
  const question = questionData?.questions[questionIndex];
  const questionText = question?.text || `Question ${questionIndex + 1}`;
  const skillOrSubscale = question?.skillName || question?.subscale;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-[#8B9A8F]">
            Question {questionIndex + 1} of {totalQuestions}
          </p>
          {skillOrSubscale && (
            <span className="text-xs px-2 py-1 rounded-full bg-[#F5F0E6] text-[#5C7A6B]">
              {skillOrSubscale}
            </span>
          )}
        </div>
        <h2 className="text-lg font-medium text-[#1E3D32]">
          {questionText}
        </h2>
        <p className="text-sm text-[#5C7A6B] mt-2">
          Rate how well this describes you.
        </p>
      </div>

      {/* Likert Scale */}
      <div className="space-y-4">
        <div className="grid gap-2">
          {Array.from({ length: scale.max - scale.min + 1 }).map((_, i) => {
            const value = scale.min + i;
            const isSelected = currentResponse === value;

            return (
              <button
                key={value}
                onClick={() => onResponse(value)}
                className={cn(
                  "p-4 rounded-lg border text-left transition-all",
                  isSelected
                    ? "border-[#5C7A6B] bg-[#5C7A6B]/10"
                    : "border-[#E8DCC4] hover:border-[#5C7A6B]/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-medium",
                      isSelected
                        ? "bg-[#5C7A6B] text-white"
                        : "bg-[#F5F0E6] text-[#5C7A6B]"
                    )}
                  >
                    {value}
                  </div>
                  <span className={cn(
                    "text-sm",
                    isSelected ? "text-[#1E3D32]" : "text-[#5C7A6B]"
                  )}>
                    {scale.labels[i]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E8DCC4]">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-[#5C7A6B]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={currentResponse === undefined}
          className="bg-[#5C7A6B] text-white hover:bg-[#4A6859]"
        >
          {questionIndex === totalQuestions - 1 ? 'Review' : 'Next'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Strengths Dual-Slider Question Step
// ============================================================================

const PROFICIENCY_LABELS = ['1 - Novice', '2 - Developing', '3 - Competent', '4 - Proficient', '5 - Expert'];
const ENERGY_LABELS = ['1 - Draining', '2 - Tiring', '3 - Neutral', '4 - Engaging', '5 - Energizing'];

function StrengthsQuestionStep({
  questionIndex,
  totalQuestions,
  responses,
  onResponse,
  onNext,
  onBack,
}: {
  questionIndex: number;
  totalQuestions: number;
  responses: Record<string, number | string>;
  onResponse: (key: string, value: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const skill = PROFESSIONAL_SKILLS[questionIndex];
  const profValue = responses[`q${questionIndex}_prof`] as number | undefined;
  const energyValue = responses[`q${questionIndex}_energy`] as number | undefined;
  const bothAnswered = profValue !== undefined && energyValue !== undefined;

  const categoryColors: Record<string, string> = {
    Leading: 'bg-blue-100 text-blue-700',
    Relating: 'bg-green-100 text-green-700',
    Executing: 'bg-amber-100 text-amber-700',
    Creating: 'bg-purple-100 text-purple-700',
  };

  const categoryLabel = skill.category.charAt(0).toUpperCase() + skill.category.slice(1);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-[#8B9A8F]">
            Skill {questionIndex + 1} of {totalQuestions}
          </p>
          <span className={cn("text-xs px-2 py-1 rounded-full", categoryColors[categoryLabel] || 'bg-gray-100 text-gray-700')}>
            {categoryLabel}
          </span>
        </div>
        <h2 className="text-lg font-medium text-[#1E3D32]">
          {skill.name}
        </h2>
        <p className="text-sm text-[#5C7A6B] mt-1">
          {skill.description}
        </p>
      </div>

      {/* Dual Rating Scales */}
      <div className="space-y-6">
        {/* Proficiency Scale */}
        <div>
          <h3 className="text-sm font-medium text-[#1E3D32] mb-3">
            Proficiency — How skilled are you?
          </h3>
          <div className="grid gap-2">
            {PROFICIENCY_LABELS.map((label, i) => {
              const value = i + 1;
              const isSelected = profValue === value;
              return (
                <button
                  key={value}
                  onClick={() => onResponse(`q${questionIndex}_prof`, value)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    isSelected
                      ? "border-[#5C7A6B] bg-[#5C7A6B]/10"
                      : "border-[#E8DCC4] hover:border-[#5C7A6B]/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                      isSelected ? "bg-[#5C7A6B] text-white" : "bg-[#F5F0E6] text-[#5C7A6B]"
                    )}>
                      {value}
                    </div>
                    <span className={cn("text-sm", isSelected ? "text-[#1E3D32]" : "text-[#5C7A6B]")}>
                      {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Energy Scale */}
        <div>
          <h3 className="text-sm font-medium text-[#1E3D32] mb-3">
            Energy — How much does this energize you?
          </h3>
          <div className="grid gap-2">
            {ENERGY_LABELS.map((label, i) => {
              const value = i + 1;
              const isSelected = energyValue === value;
              return (
                <button
                  key={value}
                  onClick={() => onResponse(`q${questionIndex}_energy`, value)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    isSelected
                      ? "border-[#D4A84B] bg-[#D4A84B]/10"
                      : "border-[#E8DCC4] hover:border-[#D4A84B]/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                      isSelected ? "bg-[#D4A84B] text-white" : "bg-[#F5F0E6] text-[#D4A84B]"
                    )}>
                      {value}
                    </div>
                    <span className={cn("text-sm", isSelected ? "text-[#1E3D32]" : "text-[#5C7A6B]")}>
                      {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E8DCC4]">
        <Button variant="ghost" onClick={onBack} className="text-[#5C7A6B]">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!bothAnswered}
          className="bg-[#5C7A6B] text-white hover:bg-[#4A6859]"
        >
          {questionIndex === totalQuestions - 1 ? 'Review' : 'Next'}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({
  type,
  responses,
  totalQuestions,
  isSubmitting,
  error,
  onEdit,
  onSubmit,
}: {
  type: AssessmentType;
  responses: Record<string, number | string>;
  totalQuestions: number;
  isSubmitting: boolean;
  error: string | null;
  onEdit: () => void;
  onSubmit: () => void;
}) {
  // For strengths, each question has 2 keys (prof + energy), others have 1
  const isStrengths = type === 'strengths';
  const answeredCount = isStrengths
    ? Array.from({ length: totalQuestions }).filter((_, i) =>
        responses[`q${i}_prof`] !== undefined && responses[`q${i}_energy`] !== undefined
      ).length
    : Object.keys(responses).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-[#1E3D32] mb-2">
          Review Your Responses
        </h2>
        <p className="text-[#5C7A6B]">
          You've answered {answeredCount} of {totalQuestions} {isStrengths ? 'skills' : 'questions'}.
        </p>
      </div>

      {answeredCount < totalQuestions && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 inline mr-2" />
            You have {totalQuestions - answeredCount} unanswered {isStrengths ? 'skills' : 'questions'}.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="p-4 rounded-lg bg-[#F5F0E6]">
        <h3 className="text-sm font-medium text-[#1E3D32] mb-3">Response Summary</h3>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const hasAnswer = isStrengths
              ? responses[`q${i}_prof`] !== undefined && responses[`q${i}_energy`] !== undefined
              : responses[`q${i}`] !== undefined;

            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded flex items-center justify-center text-xs font-medium",
                  hasAnswer
                    ? "bg-[#5C7A6B] text-white"
                    : "bg-white border border-[#E8DCC4] text-[#8B9A8F]"
                )}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#E8DCC4]">
        <Button
          variant="ghost"
          onClick={onEdit}
          className="text-[#5C7A6B]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Edit Responses
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || answeredCount === 0}
          className="bg-[#5C7A6B] text-white hover:bg-[#4A6859]"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
          <Check className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function CompleteStep({
  config,
  onViewResults,
}: {
  config: AssessmentConfig;
  onViewResults: () => void;
}) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-xl font-medium text-[#1E3D32] mb-2">
        Assessment Complete!
      </h2>
      <p className="text-[#5C7A6B] mb-6">
        Your {config.title.toLowerCase()} results have been saved.
        View your scores and insights on the assessments page.
      </p>
      <Button
        onClick={onViewResults}
        className="bg-[#5C7A6B] text-white hover:bg-[#4A6859]"
      >
        View Results
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
