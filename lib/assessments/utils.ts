/**
 * Assessment Utilities
 *
 * Client-safe utility functions for working with assessment data.
 * These functions don't require Node.js fs/path modules.
 */

import matter from 'gray-matter';
import {
  AssessmentData,
  AssessmentType,
  ValuesAlignmentData,
  StrengthsProfileData,
  SelfCompassionData,
  ExecutiveFunctionData,
} from './types';

// ============================================================================
// Core Parser (client-safe - works with content string)
// ============================================================================

/**
 * Parse a markdown file with YAML frontmatter
 */
export function parseAssessmentFile(content: string): { data: Record<string, unknown>; markdown: string } {
  const { data, content: markdown } = matter(content);
  return { data, markdown };
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
    strengths: 'Strengths Profile',
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
 * Get learned behaviors (stress indicators) from Strengths data
 */
export function getLearnedBehaviors(data: StrengthsProfileData): string[] {
  return data.quadrants.learned.filter(s => s?.trim().length > 0);
}

/**
 * Calculate EF score as percentage
 */
export function calculateEFPercentage(totalScore: number): number {
  const maxScore = 210; // 10 skills * 21 max per skill
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
