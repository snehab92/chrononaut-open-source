/**
 * Assessment Markdown Parser
 *
 * Parses markdown files with YAML frontmatter from the assessment_templates/ directory.
 * Uses gray-matter for frontmatter extraction.
 */

import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';
import {
  AssessmentData,
  AssessmentType,
  ParsedAssessmentFile,
  ValuesAlignmentData,
  StrengthsProfileData,
  SelfCompassionData,
  ExecutiveFunctionData,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const ASSESSMENT_TEMPLATES_DIR = path.join(process.cwd(), 'assessment_templates');

const ASSESSMENT_FILES: Record<AssessmentType, string> = {
  values_alignment: 'values_alignment.md',
  strengths: 'strengths_profile.md',
  self_compassion: 'self_compassion.md',
  executive_function: 'executive_function.md',
};

// ============================================================================
// Core Parser
// ============================================================================

/**
 * Parse a markdown file with YAML frontmatter
 */
export function parseAssessmentFile(content: string): { data: Record<string, unknown>; markdown: string } {
  const { data, content: markdown } = matter(content);
  return { data, markdown };
}

/**
 * Read and parse an assessment file from the templates directory
 */
export async function readAssessmentFile<T extends AssessmentData>(
  assessmentType: AssessmentType
): Promise<ParsedAssessmentFile<T> | null> {
  const filename = ASSESSMENT_FILES[assessmentType];
  const filePath = path.join(ASSESSMENT_TEMPLATES_DIR, filename);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data, markdown } = parseAssessmentFile(content);

    const isComplete = checkIfComplete(data, assessmentType);

    return {
      frontmatter: data as T,
      markdown,
      filePath,
      isComplete,
    };
  } catch (error) {
    console.error(`Failed to read assessment file: ${filePath}`, error);
    return null;
  }
}

/**
 * Read all assessment files
 */
export async function readAllAssessments(): Promise<{
  values_alignment: ParsedAssessmentFile<ValuesAlignmentData> | null;
  strengths: ParsedAssessmentFile<StrengthsProfileData> | null;
  self_compassion: ParsedAssessmentFile<SelfCompassionData> | null;
  executive_function: ParsedAssessmentFile<ExecutiveFunctionData> | null;
}> {
  const [valuesAlignment, strengths, selfCompassion, executiveFunction] = await Promise.all([
    readAssessmentFile<ValuesAlignmentData>('values_alignment'),
    readAssessmentFile<StrengthsProfileData>('strengths'),
    readAssessmentFile<SelfCompassionData>('self_compassion'),
    readAssessmentFile<ExecutiveFunctionData>('executive_function'),
  ]);

  return {
    values_alignment: valuesAlignment,
    strengths,
    self_compassion: selfCompassion,
    executive_function: executiveFunction,
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if an assessment has been filled in (not just the template)
 */
function checkIfComplete(data: Record<string, unknown>, type: AssessmentType): boolean {
  // Check if completed_date is set
  if (!data.completed_date) {
    return false;
  }

  switch (type) {
    case 'values_alignment':
      return checkValuesAlignmentComplete(data);
    case 'strengths':
      return checkStrengthsComplete(data);
    case 'self_compassion':
      return checkSelfCompassionComplete(data);
    case 'executive_function':
      return checkExecutiveFunctionComplete(data);
    default:
      return false;
  }
}

function checkValuesAlignmentComplete(data: Record<string, unknown>): boolean {
  const values = data.values as ValuesAlignmentData['values'];
  if (!Array.isArray(values) || values.length < 3) return false;

  // Check if at least the first value has a name
  return values[0]?.name?.trim().length > 0;
}

function checkStrengthsComplete(data: Record<string, unknown>): boolean {
  const quadrants = data.quadrants as StrengthsProfileData['quadrants'];
  if (!quadrants) return false;

  // Check if at least realized strengths are filled in
  return Array.isArray(quadrants.realized) &&
         quadrants.realized.some(s => s?.trim().length > 0);
}

function checkSelfCompassionComplete(data: Record<string, unknown>): boolean {
  const score = data.overall_score;
  return typeof score === 'number' && score > 0;
}

function checkExecutiveFunctionComplete(data: Record<string, unknown>): boolean {
  const totalScore = data.total_score;
  return typeof totalScore === 'number' && totalScore > 0;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isValuesAlignment(data: AssessmentData): data is ValuesAlignmentData {
  return data.assessment_type === 'values_alignment';
}

export function isStrengthsProfile(data: AssessmentData): data is StrengthsProfileData {
  return data.assessment_type === 'strengths';
}

export function isSelfCompassion(data: AssessmentData): data is SelfCompassionData {
  return data.assessment_type === 'self_compassion';
}

export function isExecutiveFunction(data: AssessmentData): data is ExecutiveFunctionData {
  return data.assessment_type === 'executive_function';
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display-friendly assessment name
 */
export function getAssessmentDisplayName(type: AssessmentType): string {
  const names: Record<AssessmentType, string> = {
    values_alignment: 'Values Alignment',
    strengths: 'Professional Skills',
    self_compassion: 'Self-Compassion',
    executive_function: 'Executive Function',
  };
  return names[type];
}

/**
 * Extract the 3 core values from Values Alignment data
 */
export function extractCoreValues(data: ValuesAlignmentData): string[] {
  return data.values
    .filter(v => v.name?.trim().length > 0)
    .map(v => v.name)
    .slice(0, 3);
}

/**
 * Get slippery behaviors for Pattern Analyzer matching
 */
export function getSlipperyBehaviors(data: ValuesAlignmentData): string[] {
  return data.values.flatMap(v => v.slippery_behaviors.filter(b => b?.trim().length > 0));
}

/**
 * Get learned behaviors (stress indicators) from Professional Skills data
 */
export function getLearnedBehaviors(data: StrengthsProfileData): string[] {
  return data.quadrants.learned.filter(s => s?.trim().length > 0);
}

/**
 * Calculate EF score as percentage
 */
export function calculateEFPercentage(totalScore: number): number {
  const maxScore = 252; // 12 skills * 21 max per skill
  return Math.round((totalScore / maxScore) * 100);
}

/**
 * Interpret self-compassion score
 */
export function interpretSelfCompassionScore(score: number): 'High' | 'Moderate' | 'Low' {
  if (score >= 3.5) return 'High';
  if (score >= 2.5) return 'Moderate';
  return 'Low';
}
