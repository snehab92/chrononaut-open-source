/**
 * Assessment Parse API
 *
 * GET /api/assessments/parse
 * Returns parsed assessment data from the markdown files in assessment_templates/
 *
 * Query params:
 * - type: Optional. Filter to specific assessment type
 *
 * Response:
 * {
 *   values_alignment: { frontmatter, isComplete } | null,
 *   strengths: { frontmatter, isComplete } | null,
 *   self_compassion: { frontmatter, isComplete } | null,
 *   executive_function: { frontmatter, isComplete } | null,
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  readAllAssessments,
  readAssessmentFile,
  getAssessmentDisplayName,
} from '@/lib/assessments/markdown-parser';
import {
  AssessmentType,
  ValuesAlignmentData,
  StrengthsProfileData,
  SelfCompassionData,
  ExecutiveFunctionData,
} from '@/lib/assessments/types';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for specific type filter
    const searchParams = request.nextUrl.searchParams;
    const typeFilter = searchParams.get('type') as AssessmentType | null;

    if (typeFilter) {
      // Return single assessment type
      const validTypes: AssessmentType[] = ['values_alignment', 'strengths', 'self_compassion', 'executive_function'];
      if (!validTypes.includes(typeFilter)) {
        return NextResponse.json(
          { error: `Invalid assessment type. Valid types: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }

      const assessment = await readAssessmentFile(typeFilter);
      if (!assessment) {
        return NextResponse.json(
          { error: `Assessment file not found: ${typeFilter}` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        type: typeFilter,
        displayName: getAssessmentDisplayName(typeFilter),
        frontmatter: assessment.frontmatter,
        isComplete: assessment.isComplete,
        filePath: assessment.filePath,
      });
    }

    // Return all assessments
    const assessments = await readAllAssessments();

    const response = {
      values_alignment: assessments.values_alignment ? {
        displayName: 'Values Alignment',
        frontmatter: assessments.values_alignment.frontmatter,
        isComplete: assessments.values_alignment.isComplete,
      } : null,
      strengths: assessments.strengths ? {
        displayName: 'Professional Strengths',
        frontmatter: assessments.strengths.frontmatter,
        isComplete: assessments.strengths.isComplete,
      } : null,
      self_compassion: assessments.self_compassion ? {
        displayName: 'Self-Compassion',
        frontmatter: assessments.self_compassion.frontmatter,
        isComplete: assessments.self_compassion.isComplete,
      } : null,
      executive_function: assessments.executive_function ? {
        displayName: 'Executive Function',
        frontmatter: assessments.executive_function.frontmatter,
        isComplete: assessments.executive_function.isComplete,
      } : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to parse assessment files:', error);
    return NextResponse.json(
      { error: 'Failed to parse assessment files' },
      { status: 500 }
    );
  }
}
