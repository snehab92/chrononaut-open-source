/**
 * Assessment Module
 *
 * Exports types and utilities for working with assessment data.
 * Client-safe exports only - server-side file operations should import from './markdown-parser' directly.
 */

// Types
export * from './types';

// Client-safe utilities (no fs/path dependencies)
export {
  parseAssessmentFile,
  isValuesAlignment,
  isStrengthsProfile,
  isSelfCompassion,
  isExecutiveFunction,
  getAssessmentDisplayName,
  extractCoreValues,
  getSlipperyBehaviors,
  getLearnedBehaviors,
  calculateEFPercentage,
  interpretSelfCompassionScore,
} from './utils';

// Note: For server-side file operations (readAssessmentFile, readAllAssessments),
// import directly from './markdown-parser' in Server Components or API routes only.
