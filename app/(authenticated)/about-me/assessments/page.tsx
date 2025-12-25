"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Leaf,
  Star,
  Shield,
  Zap,
  ChevronRight,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { ConstellationMap } from "@/components/dashboard/metrics/constellation-map";
import type {
  LatestAssessmentsResponse,
  ReminderStatus,
  ExecutiveFunctionResult,
  SelfCompassionResult,
  StrengthsResult,
  ValuesResult,
} from "@/app/api/assessments/latest/route";

// ============================================================================
// Types
// ============================================================================

interface AssessmentConfig {
  type: 'values_alignment' | 'strengths' | 'self_compassion' | 'executive_function';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  duration: string;
  frequency: string;
}

const ASSESSMENTS: AssessmentConfig[] = [
  {
    type: 'executive_function',
    title: 'Executive Function',
    description: 'Track your 12 cognitive skills and identify growth opportunities.',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    duration: '~10 min',
    frequency: 'Quarterly',
  },
  {
    type: 'self_compassion',
    title: 'Self-Compassion',
    description: 'Measure self-kindness, mindfulness, and common humanity.',
    icon: Shield,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-200',
    duration: '~8 min',
    frequency: 'Annually',
  },
  {
    type: 'strengths',
    title: 'Strengths Profile',
    description: 'Discover your realized, unrealized, and learned strengths.',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200',
    duration: '~30 min',
    frequency: 'Annually',
  },
  {
    type: 'values_alignment',
    title: 'Values Alignment',
    description: 'Define your core values and track how aligned your life is.',
    icon: Leaf,
    color: 'text-[#5C7A6B]',
    bgColor: 'bg-[#E8F5E9]',
    borderColor: 'border-[#C8E6C9]',
    duration: '~15 min',
    frequency: 'Rarely',
  },
];

// ============================================================================
// Main Page Component
// ============================================================================

type AssessmentType = 'executive_function' | 'self_compassion' | 'strengths' | 'values_alignment';

export default function AssessmentsPage() {
  const [data, setData] = useState<LatestAssessmentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<AssessmentType | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assessments/latest');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
      setError('Failed to load assessment data');
    } finally {
      setIsLoading(false);
    }
  }

  // Get reminder status for an assessment type
  const getReminder = (type: string): ReminderStatus | undefined => {
    return data?.reminders.find(r => r.assessment_type === type);
  };

  // Check if assessment has data
  const hasData = (type: string): boolean => {
    switch (type) {
      case 'executive_function':
        return !!data?.executive_function;
      case 'self_compassion':
        return !!data?.self_compassion;
      case 'strengths':
        return !!data?.strengths;
      case 'values_alignment':
        return !!data?.values_alignment;
      default:
        return false;
    }
  };

  // Get score summary for display
  const getScoreSummary = (type: string): string => {
    switch (type) {
      case 'executive_function':
        if (!data?.executive_function) return '';
        return `${data.executive_function.percentage}% (${data.executive_function.total_score}/252)`;
      case 'self_compassion':
        if (!data?.self_compassion) return '';
        return `${data.self_compassion.overall_score.toFixed(2)} / 5.0`;
      case 'strengths':
        if (!data?.strengths) return '';
        const counts = data.strengths.quadrant_counts;
        return `${counts.realized} realized, ${counts.learned} learned`;
      case 'values_alignment':
        if (!data?.values_alignment) return '';
        return data.values_alignment.values.join(', ');
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-[#8B9A8F] hover:text-[#5C7A6B] mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-serif text-[#1E3D32]">
              Personal Assessments
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
              className="text-[#8B9A8F] hover:text-[#5C7A6B]"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchData} className="mt-4" variant="outline">
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-[#F5F0E6] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Assessment Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              {ASSESSMENTS.map((assessment) => {
                const reminder = getReminder(assessment.type);
                const completed = hasData(assessment.type);
                const isDue = reminder?.is_due;
                const scoreSummary = getScoreSummary(assessment.type);
                const Icon = assessment.icon;

                return (
                  <div
                    key={assessment.type}
                    className={cn(
                      "relative p-6 rounded-xl bg-white border shadow-sm transition-all hover:shadow-md",
                      assessment.borderColor
                    )}
                  >
                    {/* Due badge */}
                    {isDue && (
                      <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-[#D4A84B] text-white text-xs font-medium rounded-full animate-pulse">
                        <Clock className="h-3 w-3" />
                        Due for retake
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className={cn("p-3 rounded-lg", assessment.bgColor)}>
                        <Icon className={cn("h-6 w-6", assessment.color)} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-[#1E3D32] mb-1">
                          {assessment.title}
                        </h3>
                        <p className="text-sm text-[#5C7A6B] line-clamp-2">
                          {assessment.description}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-[#8B9A8F]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {assessment.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {assessment.frequency}
                      </span>
                    </div>

                    {/* Score/Status indicator - clickable when completed */}
                    {completed ? (
                      <button
                        onClick={() => setSelectedResult(assessment.type)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-[#F5F0E6] mb-4 hover:bg-[#E8DCC4] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-[#5C7A6B]">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#1E3D32]">
                            {scoreSummary}
                          </span>
                          <ChevronRight className="h-4 w-4 text-[#8B9A8F]" />
                        </div>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-amber-700">Not yet taken</span>
                      </div>
                    )}

                    {/* Last taken date */}
                    {reminder?.last_taken_date && (
                      <p className="text-xs text-[#8B9A8F] mb-4">
                        Last taken: {new Date(reminder.last_taken_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    )}

                    {/* Action button - always goes to questionnaire */}
                    <Button
                      onClick={() => router.push(`/about-me/assessments/${assessment.type}`)}
                      className="w-full justify-between bg-[#5C7A6B] text-white hover:bg-[#4A6859]"
                    >
                      {isDue ? 'Retake Assessment' : 'Take Assessment'}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Constellation Map Section - Interactive insights visualization */}
            {data && (
              <div className="p-6 rounded-xl bg-white border border-[#E8DCC4]">
                <h2 className="text-lg font-medium text-[#1E3D32] mb-2 text-center">
                  Your Growth Constellation
                </h2>
                <p className="text-sm text-[#8B9A8F] text-center mb-4">
                  Click on numbered connections to explore cross-assessment insights
                </p>
                <ConstellationMap
                  assessmentStatus={{
                    executive_function: {
                      complete: !!data.executive_function,
                      score: data.executive_function?.percentage,
                    },
                    self_compassion: {
                      complete: !!data.self_compassion,
                      score: data.self_compassion
                        ? Math.round((data.self_compassion.overall_score / 5) * 100)
                        : undefined,
                    },
                    strengths: {
                      complete: !!data.strengths,
                      count: data.strengths?.quadrant_counts.realized,
                    },
                    values_alignment: {
                      complete: !!data.values_alignment,
                      score: data.values_alignment?.living_aligned_score,
                    },
                  }}
                  insights={data.insights}
                />
              </div>
            )}

            {/* Results Modal */}
            {selectedResult && data && (
              <ResultsModal
                type={selectedResult}
                data={data}
                onClose={() => setSelectedResult(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Results Modal Component
// ============================================================================

const MODAL_CONFIG: Record<AssessmentType, { title: string; icon: typeof Zap; color: string }> = {
  values_alignment: { title: 'Values Alignment', icon: Leaf, color: 'text-[#5C7A6B]' },
  strengths: { title: 'Strengths Profile', icon: Star, color: 'text-purple-600' },
  self_compassion: { title: 'Self-Compassion', icon: Shield, color: 'text-teal-600' },
  executive_function: { title: 'Executive Function', icon: Zap, color: 'text-blue-600' },
};

interface ResultsModalProps {
  type: AssessmentType;
  data: LatestAssessmentsResponse;
  onClose: () => void;
}

function ResultsModal({ type, data, onClose }: ResultsModalProps) {
  const config = MODAL_CONFIG[type];
  const IconComponent = config.icon;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <IconComponent className={cn("h-5 w-5", config.color)} />
            <span className={config.color}>{config.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {type === 'executive_function' && data.executive_function && (
            <EFResultsContent data={data.executive_function} />
          )}
          {type === 'self_compassion' && data.self_compassion && (
            <SCResultsContent data={data.self_compassion} />
          )}
          {type === 'strengths' && data.strengths && (
            <StrengthsResultsContent data={data.strengths} />
          )}
          {type === 'values_alignment' && data.values_alignment && (
            <ValuesResultsContent data={data.values_alignment} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Executive Function Results - matches growth container modal layout
function EFResultsContent({ data }: { data: ExecutiveFunctionResult }) {
  const skillDisplayNames: Record<string, string> = {
    goal_directed_persistence: 'Goal-Directed Persistence',
    organization: 'Organization',
    task_initiation: 'Task Initiation',
    metacognition: 'Metacognition',
    planning_prioritization: 'Planning & Prioritization',
    stress_tolerance: 'Stress Tolerance',
    flexibility: 'Flexibility',
    response_inhibition: 'Response Inhibition',
    sustained_attention: 'Sustained Attention',
    working_memory: 'Working Memory',
    time_management: 'Time Management',
    emotional_control: 'Emotional Control',
  };

  const sortedSkills = Object.entries(data.skills)
    .map(([key, score]) => ({ key, name: skillDisplayNames[key] || key, score }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-600 mb-1">Total Score</p>
        <p className="text-3xl font-semibold text-blue-700">
          {data.total_score} <span className="text-lg font-normal">/ 252</span>
        </p>
        <p className="text-sm text-blue-600">{data.percentage}% of maximum</p>
      </div>

      {/* Strengths section */}
      <div>
        <h4 className="text-sm font-medium text-green-700 mb-2">Strengths</h4>
        <div className="flex flex-wrap gap-1.5">
          {data.top_3_strengths.map((skill, i) => (
            <span key={i} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Growth Areas section */}
      <div>
        <h4 className="text-sm font-medium text-red-600 mb-2">Growth Areas</h4>
        <div className="flex flex-wrap gap-1.5">
          {data.bottom_3_challenges.map((skill, i) => (
            <span key={i} className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* All Skills Ranked */}
      <div>
        <h4 className="text-sm font-medium text-[#1E3D32] mb-3">All Skills (Ranked)</h4>
        <div className="space-y-2">
          {sortedSkills.map(({ name, score }) => {
            const percentage = (score / 21) * 100;
            const isStrong = score >= 15;
            const isChallenge = score < 12;

            return (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5C7A6B]">{name}</span>
                  <span className={cn(
                    isStrong && "text-green-600",
                    isChallenge && "text-red-500",
                    !isStrong && !isChallenge && "text-[#8B9A8F]"
                  )}>
                    {score}/21
                  </span>
                </div>
                <div className="h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isStrong && "bg-green-400",
                      isChallenge && "bg-red-300",
                      !isStrong && !isChallenge && "bg-blue-400"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Self-Compassion Results
function SCResultsContent({ data }: { data: SelfCompassionResult }) {
  return (
    <div className="space-y-4">
      <div className="text-center p-4 rounded-lg bg-teal-50 border border-teal-200">
        <p className="text-sm text-teal-600 mb-1">Overall Score</p>
        <p className="text-3xl font-semibold text-teal-700">{data.overall_score.toFixed(2)}</p>
        <p className="text-sm text-teal-600">
          {data.overall_score >= 4.0 ? 'High self-compassion' :
           data.overall_score >= 2.5 ? 'Moderate self-compassion' :
           'Opportunity for growth'}
        </p>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[#1E3D32] mb-2">Positive (Higher = Better)</h4>
        <div className="space-y-2">
          {data.positive_subscales.map(({ name, score, above_threshold }) => (
            <SubscaleBar key={name} name={name} score={score} isPositive isAboveThreshold={above_threshold} />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[#1E3D32] mb-2">Negative (Lower = Better)</h4>
        <div className="space-y-2">
          {data.negative_subscales.map(({ name, score, above_threshold }) => (
            <SubscaleBar key={name} name={name} score={score} isPositive={false} isAboveThreshold={above_threshold} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SubscaleBar({ name, score, isPositive, isAboveThreshold }: {
  name: string;
  score: number;
  isPositive: boolean;
  isAboveThreshold: boolean;
}) {
  const percentage = (score / 5) * 100;
  const isGood = isPositive ? isAboveThreshold : !isAboveThreshold;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#5C7A6B]">{name}</span>
        <span className={isGood ? 'text-green-600' : 'text-red-500'}>{score.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", isGood ? "bg-green-400" : "bg-red-300")}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Strengths Results - shows ALL skills with top 5 bolded
function StrengthsResultsContent({ data }: { data: StrengthsResult }) {
  const quadrantConfig = [
    { key: 'all_realized' as const, label: 'Realized Strengths', color: 'green', desc: 'Use these daily', count: data.quadrant_counts.realized },
    { key: 'all_unrealized' as const, label: 'Unrealized Potential', color: 'blue', desc: 'Develop these', count: data.quadrant_counts.unrealized },
    { key: 'all_learned' as const, label: 'Learned Behaviors', color: 'yellow', desc: 'Watch for overuse', count: data.quadrant_counts.learned },
    { key: 'all_weakness' as const, label: 'Weaknesses', color: 'red', desc: 'Minimize time here', count: data.quadrant_counts.weakness },
  ];

  return (
    <div className="space-y-3">
      {quadrantConfig.map(({ key, label, color, desc, count }) => {
        const items = data[key] || [];
        if (items.length === 0) return null;

        return (
          <div
            key={key}
            className={cn(
              "p-3 rounded-lg border",
              color === 'green' && "bg-green-50 border-green-200",
              color === 'blue' && "bg-blue-50 border-blue-200",
              color === 'yellow' && "bg-yellow-50 border-yellow-200",
              color === 'red' && "bg-red-50 border-red-200"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className={cn(
                "font-medium",
                color === 'green' && "text-green-800",
                color === 'blue' && "text-blue-800",
                color === 'yellow' && "text-yellow-800",
                color === 'red' && "text-red-800"
              )}>
                {label} ({count})
              </h5>
              <span className={cn(
                "text-xs",
                color === 'green' && "text-green-600",
                color === 'blue' && "text-blue-600",
                color === 'yellow' && "text-yellow-600",
                color === 'red' && "text-red-600"
              )}>
                {desc}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item, i) => {
                const isTop5 = item.rank <= 5;
                return (
                  <span
                    key={i}
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-full",
                      color === 'green' && "bg-green-100 text-green-700",
                      color === 'blue' && "bg-blue-100 text-blue-700",
                      color === 'yellow' && "bg-yellow-100 text-yellow-700",
                      color === 'red' && "bg-red-100 text-red-700",
                      isTop5 && "font-bold"
                    )}
                  >
                    {item.name}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Values Results - amber/yellow theme to match growth metrics
function ValuesResultsContent({ data }: { data: ValuesResult }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-[#1E3D32] mb-2">Your Core Values</h4>
        <div className="flex flex-wrap gap-2">
          {data.values.map((value, i) => (
            <span
              key={i}
              className="px-3 py-1.5 text-sm font-medium bg-amber-50 text-amber-800 rounded-lg border border-amber-200"
            >
              {value}
            </span>
          ))}
        </div>
      </div>

      {data.living_aligned_score !== undefined && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
          <p className="text-sm text-amber-600 mb-1">Living Aligned Score</p>
          <p className="text-3xl font-semibold text-amber-700">{data.living_aligned_score}%</p>
          {data.living_aligned_trend && (
            <p className="text-sm text-amber-600 mt-1">
              Trend: {data.living_aligned_trend === 'up' ? '↑ Improving' : data.living_aligned_trend === 'down' ? '↓ Declining' : '→ Stable'}
            </p>
          )}
        </div>
      )}

      {data.early_warning_signs?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[#1E3D32] mb-2">Early Warning Signs</h4>
          <ul className="space-y-1">
            {data.early_warning_signs.map((sign, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#5C7A6B]">
                <span className="text-amber-500">•</span>
                {sign}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
