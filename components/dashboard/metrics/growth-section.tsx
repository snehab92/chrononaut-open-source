"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Lightbulb, ChevronRight, Leaf, Star, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// New assessment card components
import {
  ValuesCard,
  StrengthsCard,
  SelfCompassionCard,
  ExecutiveFunctionCard,
} from "./assessment-cards";

// Assessment types
import {
  AssessmentType,
  ValuesAlignmentData,
  ValuesAlignmentInsights,
  StrengthsProfileData,
  SelfCompassionData,
  ExecutiveFunctionData,
} from "@/lib/assessments/types";

// Import types from the new API
import type {
  LatestAssessmentsResponse,
  ExecutiveFunctionResult,
  SelfCompassionResult,
  StrengthsResult,
  ValuesResult,
  AssessmentInsight,
  ReminderStatus,
} from "@/app/api/assessments/latest/route";

// ============================================================================
// Types
// ============================================================================

interface TransformedAssessments {
  values_alignment: ValuesAlignmentInsights | null;
  strengths: StrengthsProfileData | null;
  self_compassion: SelfCompassionData | null;
  executive_function: ExecutiveFunctionData | null;
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

function transformValuesData(data: ValuesResult | null): ValuesAlignmentInsights | null {
  if (!data) return null;

  return {
    assessment_type: 'values_alignment',
    completed_date: data.assessment_date,
    version: 1,
    values: data.values.map(v => ({
      name: v,
      supporting_behaviors: [],
      slippery_behaviors: [],
      living_into_example: '',
    })),
    support_person: '',
    support_description: '',
    self_compassion_act: '',
    early_warning_signs: data.early_warning_signs || [],
    alignment_feeling: '',
    check_yourself_method: '',
    living_aligned_score: data.living_aligned_score,
    living_aligned_trend: data.living_aligned_trend,
  };
}

function transformStrengthsData(data: StrengthsResult | null): StrengthsProfileData | null {
  if (!data) return null;

  return {
    assessment_type: 'strengths',
    completed_date: data.assessment_date,
    version: 1,
    quadrants: {
      realized: data.top_realized.map(s => s.name),
      unrealized: data.top_unrealized.map(s => s.name),
      learned: data.top_learned.map(s => s.name),
      weakness: data.top_weakness.map(s => s.name),
    },
    // Add counts as metadata for the card
    _quadrant_counts: data.quadrant_counts,
  } as StrengthsProfileData & { _quadrant_counts: typeof data.quadrant_counts };
}

function transformSelfCompassionData(data: SelfCompassionResult | null): SelfCompassionData | null {
  if (!data) return null;

  const overall = data.overall_score;
  let interpretation = 'Moderate';
  if (overall >= 4.0) interpretation = 'High';
  else if (overall < 2.5) interpretation = 'Low';

  return {
    assessment_type: 'self_compassion',
    completed_date: data.assessment_date,
    version: 1,
    overall_score: data.overall_score,
    subscales: data.subscales,
    interpretation,
  };
}

function transformExecutiveFunctionData(data: ExecutiveFunctionResult | null): ExecutiveFunctionData | null {
  if (!data) return null;

  const skillNames: Record<string, string> = {
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

  const skills = Object.entries(data.skills).map(([key, score]) => ({
    name: skillNames[key] || key,
    score: score,
    behaviors: [],
  }));

  return {
    assessment_type: 'executive_function',
    completed_date: data.assessment_date,
    version: 1,
    total_score: data.total_score,
    skills,
    strongest_skills: data.top_3_strengths,
    challenge_areas: data.bottom_3_challenges,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function GrowthSection() {
  const [selectedType, setSelectedType] = useState<AssessmentType | null>(null);
  const [rawData, setRawData] = useState<LatestAssessmentsResponse | null>(null);
  const [assessments, setAssessments] = useState<TransformedAssessments | null>(null);
  const [insights, setInsights] = useState<AssessmentInsight[]>([]);
  const [reminders, setReminders] = useState<ReminderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch from the new unified endpoint
      const response = await fetch('/api/assessments/latest');

      if (!response.ok) {
        throw new Error('Failed to fetch assessment data');
      }

      const data: LatestAssessmentsResponse = await response.json();
      setRawData(data);

      // Transform data for card components
      setAssessments({
        values_alignment: transformValuesData(data.values_alignment),
        strengths: transformStrengthsData(data.strengths),
        self_compassion: transformSelfCompassionData(data.self_compassion),
        executive_function: transformExecutiveFunctionData(data.executive_function),
      });

      // Store insights and reminders
      setInsights(data.insights || []);
      setReminders(data.reminders || []);

    } catch (err) {
      console.error('Failed to fetch assessment data:', err);
      setError('Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  }

  // Check if EF reminder is due
  const efReminderDue = reminders.find(r => r.assessment_type === 'executive_function')?.is_due || false;

  // Get Living Aligned score from values data
  const livingAlignedScore = rawData?.values_alignment?.living_aligned_score;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAllData}
          disabled={isLoading}
          className="h-6 px-2 text-xs text-[#8B9A8F] hover:text-[#5C7A6B]"
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
          Refresh
        </Button>
        <Link
          href="/about-me/assessments"
          className="flex items-center gap-1 h-6 px-2 text-xs font-medium text-[#5C7A6B] hover:text-[#2D5A47] transition-colors"
        >
          Assessments Hub
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-[#F5F0E6] animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Values Alignment Card */}
          <ValuesCard
            data={assessments?.values_alignment || null}
            isComplete={!!rawData?.values_alignment}
            livingAlignedScore={livingAlignedScore}
            onExpand={() => setSelectedType('values_alignment')}
          />

          {/* Professional Skills Card */}
          <StrengthsCard
            data={assessments?.strengths || null}
            isComplete={!!rawData?.strengths}
            onExpand={() => setSelectedType('strengths')}
          />

          {/* Self-Compassion Card */}
          <SelfCompassionCard
            data={assessments?.self_compassion || null}
            isComplete={!!rawData?.self_compassion}
            onExpand={() => setSelectedType('self_compassion')}
          />

          {/* Executive Function Card */}
          <ExecutiveFunctionCard
            data={assessments?.executive_function || null}
            isComplete={!!rawData?.executive_function}
            reminderDue={efReminderDue}
            onExpand={() => setSelectedType('executive_function')}
          />
        </div>
      )}

      {/* Assessment Detail Modal */}
      {selectedType && assessments && (
        <AssessmentModal
          type={selectedType}
          rawData={rawData}
          transformedData={assessments[selectedType]}
          insights={insights.filter(i => i.source_assessments.includes(selectedType))}
          onClose={() => setSelectedType(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Modal Component with Insights
// ============================================================================

interface AssessmentModalProps {
  type: AssessmentType;
  rawData: LatestAssessmentsResponse | null;
  transformedData: ValuesAlignmentInsights | StrengthsProfileData | SelfCompassionData | ExecutiveFunctionData | null;
  insights: AssessmentInsight[];
  onClose: () => void;
}

const MODAL_CONFIG: Record<AssessmentType, { title: string; icon: 'leaf' | 'star' | 'shield' | 'zap'; color: string }> = {
  values_alignment: { title: 'Values Alignment', icon: 'leaf', color: 'text-[#5C7A6B]' },
  strengths: { title: 'Professional Skills', icon: 'star', color: 'text-purple-600' },
  self_compassion: { title: 'Self-Compassion', icon: 'shield', color: 'text-teal-600' },
  executive_function: { title: 'Executive Function', icon: 'zap', color: 'text-blue-600' },
};

const ICON_MAP = {
  leaf: Leaf,
  star: Star,
  shield: Shield,
  zap: Zap,
};

function AssessmentModal({ type, rawData, transformedData, insights, onClose }: AssessmentModalProps) {
  const config = MODAL_CONFIG[type];
  const hasData = !!transformedData;
  const IconComponent = ICON_MAP[config.icon];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <IconComponent className={cn("h-5 w-5", config.color)} />
            <span className={config.color}>{config.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasData ? (
            <>
              <AssessmentModalContent type={type} rawData={rawData} transformedData={transformedData} />

              {/* Pattern Analyzer Insights */}
              {insights.length > 0 && (
                <div className="pt-4 border-t border-[#E8DCC4]">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-[#1E3D32] mb-3">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Pattern Insights
                  </h4>
                  <div className="space-y-2">
                    {insights.map((insight) => (
                      <InsightCard key={insight.id} insight={insight} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-[#5C7A6B] mb-4">
                Take this assessment to see your results and insights.
              </p>
              <Button
                variant="outline"
                className="border-[#D4A84B] text-[#D4A84B] hover:bg-[#D4A84B] hover:text-white"
              >
                Go to About Me → Assessments
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Insight Card Component
// ============================================================================

function InsightCard({ insight }: { insight: AssessmentInsight }) {
  const severityColors = {
    gentle: 'bg-green-50 border-green-200 text-green-800',
    notable: 'bg-amber-50 border-amber-200 text-amber-800',
    significant: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={cn("p-3 rounded-lg border text-sm", severityColors[insight.severity])}>
      {insight.content}
    </div>
  );
}

// ============================================================================
// Modal Content Components
// ============================================================================

function AssessmentModalContent({
  type,
  rawData,
  transformedData,
}: {
  type: AssessmentType;
  rawData: LatestAssessmentsResponse | null;
  transformedData: ValuesAlignmentInsights | StrengthsProfileData | SelfCompassionData | ExecutiveFunctionData | null;
}) {
  switch (type) {
    case 'values_alignment':
      return <ValuesModalContent data={rawData?.values_alignment} />;
    case 'strengths':
      return <StrengthsModalContent data={rawData?.strengths} />;
    case 'self_compassion':
      return <SelfCompassionModalContent data={rawData?.self_compassion} />;
    case 'executive_function':
      return <ExecutiveFunctionModalContent data={rawData?.executive_function} />;
    default:
      return null;
  }
}

function ValuesModalContent({ data }: { data: ValuesResult | null | undefined }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Core Values */}
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

      {/* Living Aligned Score */}
      {data.living_aligned_score !== undefined && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
          <p className="text-sm text-amber-600 mb-1">Living Aligned Score</p>
          <p className="text-3xl font-semibold text-amber-700">
            {data.living_aligned_score}%
          </p>
          {data.living_aligned_trend && (
            <p className="text-sm text-amber-600 mt-1">
              Trend: {data.living_aligned_trend === 'up' ? '📈 Improving' : data.living_aligned_trend === 'down' ? '📉 Declining' : '➡️ Stable'}
            </p>
          )}
        </div>
      )}

      {/* Early Warning Signs */}
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

function StrengthsModalContent({ data }: { data: StrengthsResult | null | undefined }) {
  if (!data) return null;

  const quadrantConfig = [
    { key: 'top_realized' as const, label: 'Strengths', color: 'green', desc: 'High proficiency & energy', count: data.quadrant_counts.realized },
    { key: 'top_unrealized' as const, label: 'Growth Opportunities', color: 'blue', desc: 'High energy, room to grow', count: data.quadrant_counts.unrealized },
    { key: 'top_learned' as const, label: 'Learned Behaviors', color: 'yellow', desc: 'Capable but draining', count: data.quadrant_counts.learned },
    { key: 'top_weakness' as const, label: 'Delegate/Develop', color: 'gray', desc: 'Consider delegating', count: data.quadrant_counts.weakness },
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
              {items.map((item, i) => (
                <span
                  key={i}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    color === 'green' && "bg-green-100 text-green-700",
                    color === 'blue' && "bg-blue-100 text-blue-700",
                    color === 'yellow' && "bg-yellow-100 text-yellow-700",
                    color === 'red' && "bg-red-100 text-red-700"
                  )}
                >
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SelfCompassionModalContent({ data }: { data: SelfCompassionResult | null | undefined }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="text-center p-4 rounded-lg bg-teal-50 border border-teal-200">
        <p className="text-sm text-teal-600 mb-1">Overall Score</p>
        <p className="text-3xl font-semibold text-teal-700">
          {data.overall_score.toFixed(2)}
        </p>
        <p className="text-sm text-teal-600">
          {data.overall_score >= 4.0 ? 'High self-compassion' :
           data.overall_score >= 2.5 ? 'Moderate self-compassion' :
           'Opportunity for growth'}
        </p>
      </div>

      {/* Positive Subscales */}
      <div>
        <h4 className="text-sm font-medium text-[#1E3D32] mb-2">Positive (Higher = Better)</h4>
        <div className="space-y-2">
          {data.positive_subscales.map(({ name, score, above_threshold }) => (
            <SubscaleBar
              key={name}
              name={name}
              score={score}
              isPositive
              isAboveThreshold={above_threshold}
            />
          ))}
        </div>
      </div>

      {/* Negative Subscales */}
      <div>
        <h4 className="text-sm font-medium text-[#1E3D32] mb-2">Negative (Lower = Better)</h4>
        <div className="space-y-2">
          {data.negative_subscales.map(({ name, score, above_threshold }) => (
            <SubscaleBar
              key={name}
              name={name}
              score={score}
              isPositive={false}
              isAboveThreshold={above_threshold}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SubscaleBar({
  name,
  score,
  isPositive,
  isAboveThreshold,
}: {
  name: string;
  score: number;
  isPositive: boolean;
  isAboveThreshold: boolean;
}) {
  const percentage = (score / 5) * 100;
  // For positive subscales: above threshold is good (green)
  // For negative subscales: above threshold is bad (red)
  const isGood = isPositive ? isAboveThreshold : !isAboveThreshold;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#5C7A6B]">{name}</span>
        <span className={isGood ? 'text-green-600' : 'text-red-500'}>
          {score.toFixed(2)}
        </span>
      </div>
      <div className="h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isGood ? "bg-green-400" : "bg-red-300"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ExecutiveFunctionModalContent({ data }: { data: ExecutiveFunctionResult | null | undefined }) {
  if (!data) return null;

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

  // Sort skills by score (highest first)
  const sortedSkills = Object.entries(data.skills)
    .map(([key, score]) => ({ key, name: skillDisplayNames[key] || key, score }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      {/* Total Score */}
      <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-600 mb-1">Total Score</p>
        <p className="text-3xl font-semibold text-blue-700">
          {data.total_score} <span className="text-lg font-normal">/ 252</span>
        </p>
        <p className="text-sm text-blue-600">
          {data.percentage}% of maximum
        </p>
      </div>

      {/* Top Strengths */}
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

      {/* Challenge Areas */}
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

      {/* Skills Table */}
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
