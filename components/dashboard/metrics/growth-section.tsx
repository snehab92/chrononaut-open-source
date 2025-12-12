"use client";

import { useState } from "react";
import { Shield, Target, Zap, Star, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Assessment {
  id: string;
  type: 'self_compassion' | 'values_alignment' | 'executive_function' | 'strengths_profile';
  score: number;
  maxScore: number;
  takenAt: string;
}

interface GrowthSectionProps {
  assessments?: Assessment[];
}

const ASSESSMENT_CONFIG = {
  self_compassion: {
    title: 'Self-Compassion',
    icon: Shield,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    description: 'How kindly do you treat yourself during difficult times?',
    link: 'https://self-compassion.org/self-compassion-test/',
  },
  values_alignment: {
    title: 'Values Alignment',
    icon: Target,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    description: 'How well are you living according to your core values?',
    link: 'https://brenebrown.com/resources/living-into-our-values/',
  },
  executive_function: {
    title: 'Executive Function',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'How effectively are you managing attention, planning, and impulse control?',
    link: null,
  },
  strengths_profile: {
    title: 'Strengths Profile',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'What are your signature strengths and how are you using them?',
    link: 'https://www.viacharacter.org/survey/account/register',
  },
};

type AssessmentType = keyof typeof ASSESSMENT_CONFIG;

export function GrowthSection({ assessments = [] }: GrowthSectionProps) {
  const [selectedType, setSelectedType] = useState<AssessmentType | null>(null);

  // Group assessments by type, get latest for each
  const latestByType = new Map<AssessmentType, Assessment>();
  for (const assessment of assessments) {
    const existing = latestByType.get(assessment.type);
    if (!existing || new Date(assessment.takenAt) > new Date(existing.takenAt)) {
      latestByType.set(assessment.type, assessment);
    }
  }

  const assessmentTypes: AssessmentType[] = [
    'self_compassion',
    'values_alignment',
    'executive_function',
    'strengths_profile',
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[#5C7A6B] uppercase tracking-wide">
        Growth Assessments
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {assessmentTypes.map((type) => {
          const config = ASSESSMENT_CONFIG[type];
          const Icon = config.icon;
          const assessment = latestByType.get(type);

          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className="group p-4 rounded-xl bg-gradient-to-br from-white to-[#F5F0E6] border border-[#E8DCC4] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2 rounded-lg", config.bgColor, config.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <ChevronRight className="h-4 w-4 text-[#8B9A8F] group-hover:text-[#5C7A6B] transition-colors" />
              </div>

              <h4 className="font-medium text-[#1E3D32] mb-1">
                {config.title}
              </h4>

              {assessment ? (
                <>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-serif font-semibold text-[#1E3D32]">
                      {assessment.score}
                    </span>
                    <span className="text-sm text-[#5C7A6B]">
                      / {assessment.maxScore}
                    </span>
                  </div>
                  <p className="text-xs text-[#8B9A8F]">
                    Last taken {formatRelativeDate(assessment.takenAt)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-[#8B9A8F] mb-2">
                    Not yet taken
                  </p>
                  <p className="text-xs text-[#D4A84B] font-medium">
                    Take assessment →
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Assessment Detail Modal */}
      {selectedType && (
        <Dialog open={!!selectedType} onOpenChange={() => setSelectedType(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-serif">
                {(() => {
                  const config = ASSESSMENT_CONFIG[selectedType];
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className={cn("h-5 w-5", config.color)} />
                      {config.title}
                    </>
                  );
                })()}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-[#5C7A6B]">
                {ASSESSMENT_CONFIG[selectedType].description}
              </p>

              {latestByType.get(selectedType) ? (
                <>
                  <div className="p-4 rounded-lg bg-[#F5F0E6]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#5C7A6B]">Latest Score</span>
                      <span className="text-sm text-[#8B9A8F]">
                        {formatRelativeDate(latestByType.get(selectedType)!.takenAt)}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-serif font-semibold text-[#1E3D32]">
                        {latestByType.get(selectedType)!.score}
                      </span>
                      <span className="text-lg text-[#5C7A6B]">
                        / {latestByType.get(selectedType)!.maxScore}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-2 bg-[#E8DCC4] rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all", ASSESSMENT_CONFIG[selectedType].bgColor.replace('100', '500'))}
                        style={{ 
                          width: `${(latestByType.get(selectedType)!.score / latestByType.get(selectedType)!.maxScore) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8DCC4]">
                    <p className="text-xs text-[#8B9A8F] mb-3">
                      Retake this assessment periodically to track your growth over time.
                    </p>
                    {ASSESSMENT_CONFIG[selectedType].link && (
                      <a
                        href={ASSESSMENT_CONFIG[selectedType].link!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-[#D4A84B] hover:text-[#2D5A47] transition-colors"
                      >
                        Retake assessment →
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className={cn(
                    "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                    ASSESSMENT_CONFIG[selectedType].bgColor
                  )}>
                    {(() => {
                      const Icon = ASSESSMENT_CONFIG[selectedType].icon;
                      return <Icon className={cn("h-8 w-8", ASSESSMENT_CONFIG[selectedType].color)} />;
                    })()}
                  </div>
                  <p className="text-[#5C7A6B] mb-4">
                    You haven't taken this assessment yet.
                  </p>
                  {ASSESSMENT_CONFIG[selectedType].link ? (
                    <a
                      href={ASSESSMENT_CONFIG[selectedType].link!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#2D5A47] text-white rounded-lg hover:bg-[#1E3D32] transition-colors"
                    >
                      Take assessment →
                    </a>
                  ) : (
                    <p className="text-sm text-[#8B9A8F]">
                      Assessment template coming soon
                    </p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
