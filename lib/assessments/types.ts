/**
 * Assessment Types and Interfaces
 *
 * These types define the structure of assessment data stored in YAML frontmatter
 * in the assessment_templates/*.md files.
 */

// ============================================================================
// Base Types
// ============================================================================

export type AssessmentType =
  | 'values_alignment'
  | 'strengths'
  | 'self_compassion'
  | 'executive_function';

export interface BaseAssessmentData {
  assessment_type: AssessmentType;
  completed_date: string | null;  // YYYY-MM-DD format
  version: number;
  source?: string;
}

// ============================================================================
// Values Alignment Assessment
// ============================================================================

export interface ValueDefinition {
  name: string;
  supporting_behaviors: string[];
  slippery_behaviors: string[];
  living_into_example: string;
}

export interface ValuesAlignmentData extends BaseAssessmentData {
  assessment_type: 'values_alignment';
  values: ValueDefinition[];
  support_person: string;
  support_description: string;
  self_compassion_act: string;
  early_warning_signs: string[];
  alignment_feeling: string;
  check_yourself_method: string;
}

// Computed data added by Pattern Analyzer
export interface ValuesAlignmentInsights extends ValuesAlignmentData {
  living_aligned_score?: number;  // 0-100, computed from 30d patterns
  living_aligned_trend?: 'up' | 'down' | 'stable';
  recent_highlights?: string[];
  recent_concerns?: string[];
}

// ============================================================================
// Professional Skills Assessment
// ============================================================================

export interface StrengthsQuadrants {
  realized: string[];     // Strengths: High Proficiency + High Energy
  unrealized: string[];   // Growth Opportunities: Low Proficiency + High Energy
  learned: string[];      // Learned Behaviors: High Proficiency + Low Energy (STRESS INDICATOR)
  weakness: string[];     // Delegate/Develop: Low Proficiency + Low Energy
}

export interface StrengthsFamilyDistribution {
  being: number | null;
  communicating: number | null;
  motivating: number | null;
  relating: number | null;
  thinking: number | null;
}

export interface StrengthsProfileData extends BaseAssessmentData {
  assessment_type: 'strengths';
  quadrants: StrengthsQuadrants;
  family_distribution?: StrengthsFamilyDistribution;
}

// ============================================================================
// Self-Compassion Assessment
// ============================================================================

export interface SelfCompassionSubscales {
  // Positive subscales (higher = better)
  self_kindness: number | null;
  common_humanity: number | null;
  mindfulness: number | null;
  // Negative subscales (lower = better)
  self_judgment: number | null;
  isolation: number | null;
  over_identification: number | null;
}

export interface SelfCompassionData extends BaseAssessmentData {
  assessment_type: 'self_compassion';
  overall_score: number | null;  // 1.0 - 5.0 scale
  subscales: SelfCompassionSubscales;
  interpretation: string;  // "High", "Moderate", "Low"
  strengths?: string[];
  growth_areas?: string[];
}

// ============================================================================
// Executive Function Assessment
// ============================================================================

export interface ExecutiveFunctionSkill {
  name: string;
  score: number | null;  // 0-21
  behaviors: string[];
}

export const EXECUTIVE_FUNCTION_SKILLS = [
  'Goal-Directed Persistence',
  'Organization',
  'Task Initiation',
  'Metacognition',
  'Planning/Prioritization',
  'Stress Tolerance',
  'Flexibility',
  'Sustained Attention',
  'Working Memory',
  'Emotional Control',
] as const;

export type ExecutiveFunctionSkillName = typeof EXECUTIVE_FUNCTION_SKILLS[number];

export interface ExecutiveFunctionData extends BaseAssessmentData {
  assessment_type: 'executive_function';
  total_score: number | null;  // Max 252 (12 skills * 21)
  skills: ExecutiveFunctionSkill[];
  strongest_skills?: string[];
  challenge_areas?: string[];
}

// Historical tracking for EF trends
export interface ExecutiveFunctionHistoryEntry {
  assessment_date: string;
  total_score: number;
  skills: Record<string, number>;
}

// ============================================================================
// Union Type for All Assessments
// ============================================================================

export type AssessmentData =
  | ValuesAlignmentData
  | StrengthsProfileData
  | SelfCompassionData
  | ExecutiveFunctionData;

export type AssessmentInsights =
  | ValuesAlignmentInsights
  | StrengthsProfileData
  | SelfCompassionData
  | ExecutiveFunctionData;

// ============================================================================
// Parsed File Result
// ============================================================================

export interface ParsedAssessmentFile<T extends AssessmentData = AssessmentData> {
  frontmatter: T;
  markdown: string;
  filePath: string;
  isComplete: boolean;  // Has the user filled in the data?
}

// ============================================================================
// Pattern Analyzer Flags
// ============================================================================

export type AssessmentFlagType =
  | 'values_misalignment'
  | 'learned_overuse'
  | 'weakness_reliance'
  | 'low_self_compassion'
  | 'self_critical'
  | 'isolation_pattern'
  | 'ef_challenge';

export type FlagSeverity = 'gentle' | 'notable' | 'significant';

export interface AssessmentFlag {
  type: AssessmentFlagType;
  assessment: AssessmentType;
  detail: string;
  severity: FlagSeverity;
  suggestion: string;
  detected_at: string;  // ISO timestamp
}

// ============================================================================
// Reminder Types
// ============================================================================

export interface AssessmentReminder {
  assessment_type: AssessmentType;
  last_taken_date: string | null;
  next_reminder_date: string | null;
  reminder_frequency_days: number;
  dismissed_until: string | null;
  is_due: boolean;
}
