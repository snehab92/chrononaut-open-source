/**
 * Assessment Question Data
 *
 * Contains all questions for each assessment type,
 * parsed from the assessment_templates/ markdown files.
 */

// ============================================================================
// Types
// ============================================================================

export interface Question {
  id: number;
  text: string;
  subscale?: string;
  skillName?: string;
}

export interface AssessmentQuestions {
  type: string;
  title: string;
  instructions: string[];
  scale: {
    min: number;
    max: number;
    labels: string[];
  };
  questions: Question[];
}

// ============================================================================
// Executive Function Questions (36 total)
// ============================================================================

export const EXECUTIVE_FUNCTION_QUESTIONS: AssessmentQuestions = {
  type: 'executive_function',
  title: 'Executive Function Assessment',
  instructions: [
    'This assessment measures 12 executive function skills based on the Dawson framework.',
    'For each statement, rate how well it describes you from 1-7.',
    'Answer honestly based on your typical behavior, not your best or worst days.',
  ],
  scale: {
    min: 1,
    max: 7,
    labels: [
      'Strongly disagree',
      'Disagree',
      'Tend to disagree',
      'Neutral',
      'Tend to agree',
      'Agree',
      'Strongly agree',
    ],
  },
  questions: [
    // Response Inhibition (questions 0-2)
    { id: 0, text: "I don't jump to conclusions", skillName: 'Response Inhibition' },
    { id: 1, text: 'I think before I speak', skillName: 'Response Inhibition' },
    { id: 2, text: "I don't take action without having all the facts", skillName: 'Response Inhibition' },

    // Working Memory (questions 3-5)
    { id: 3, text: 'I have a good memory for facts, dates, and details', skillName: 'Working Memory' },
    { id: 4, text: 'I am very good at remembering the things I have committed to do', skillName: 'Working Memory' },
    { id: 5, text: 'I seldom need reminders to complete tasks', skillName: 'Working Memory' },

    // Emotional Control (questions 6-8)
    { id: 6, text: 'My emotions seldom get in the way when performing on the job', skillName: 'Emotional Control' },
    { id: 7, text: 'Little things do not affect me emotionally or distract me from the task at hand', skillName: 'Emotional Control' },
    { id: 8, text: 'I can defer my personal feelings until after a task has been completed', skillName: 'Emotional Control' },

    // Task Initiation (questions 9-11)
    { id: 9, text: 'No matter what the task, I believe in getting started as soon as possible', skillName: 'Task Initiation' },
    { id: 10, text: 'Procrastination is usually not a problem for me', skillName: 'Task Initiation' },
    { id: 11, text: 'I seldom leave tasks to the last minute', skillName: 'Task Initiation' },

    // Sustained Attention (questions 12-14)
    { id: 12, text: 'I find it easy to stay focused on my work', skillName: 'Sustained Attention' },
    { id: 13, text: "Once I start an assignment, I work diligently until it's completed", skillName: 'Sustained Attention' },
    { id: 14, text: 'Even when interrupted, I find it easy to get back and complete the job at hand', skillName: 'Sustained Attention' },

    // Planning/Prioritization (questions 15-17)
    { id: 15, text: 'When I plan out my day, I identify priorities and stick to them', skillName: 'Planning & Prioritization' },
    { id: 16, text: 'When I have a lot to do, I can easily focus on the most important things', skillName: 'Planning & Prioritization' },
    { id: 17, text: 'I typically break big tasks down into subtasks and timelines', skillName: 'Planning & Prioritization' },

    // Organization (questions 18-20)
    { id: 18, text: 'I am an organized person', skillName: 'Organization' },
    { id: 19, text: 'It is natural for me to keep my work area neat and organized', skillName: 'Organization' },
    { id: 20, text: 'I am good at maintaining systems for organizing my work', skillName: 'Organization' },

    // Time Management (questions 21-23)
    { id: 21, text: "At the end of the day, I've usually finished what I set out to do", skillName: 'Time Management' },
    { id: 22, text: 'I am good at estimating how long it takes to do something', skillName: 'Time Management' },
    { id: 23, text: 'I am usually on time for appointments and activities', skillName: 'Time Management' },

    // Flexibility (questions 24-26)
    { id: 24, text: 'I take unexpected events in stride', skillName: 'Flexibility' },
    { id: 25, text: 'I easily adjust to changes in plans and priorities', skillName: 'Flexibility' },
    { id: 26, text: 'I consider myself to be flexible and adaptive to change', skillName: 'Flexibility' },

    // Metacognition (questions 27-29)
    { id: 27, text: 'I routinely evaluate my performance and devise methods for personal improvement', skillName: 'Metacognition' },
    { id: 28, text: 'I am able to step back from a situation in order to make objective decisions', skillName: 'Metacognition' },
    { id: 29, text: '"Read" situations well and can adjust my behavior based on the reactions of others', skillName: 'Metacognition' },

    // Goal-Directed Persistence (questions 30-32)
    { id: 30, text: 'I think of myself as being driven to meet my goals', skillName: 'Goal-Directed Persistence' },
    { id: 31, text: 'I easily give up immediate pleasures to work on long-term goals', skillName: 'Goal-Directed Persistence' },
    { id: 32, text: 'I believe in setting and achieving high levels of performance', skillName: 'Goal-Directed Persistence' },

    // Stress Tolerance (questions 33-35)
    { id: 33, text: 'I enjoy working in a highly demanding, fast-paced environment', skillName: 'Stress Tolerance' },
    { id: 34, text: 'A certain amount of pressure helps me to perform at my best', skillName: 'Stress Tolerance' },
    { id: 35, text: 'Jobs that include a fair degree of unpredictability appeal to me', skillName: 'Stress Tolerance' },
  ],
};

// ============================================================================
// Self-Compassion Questions (26 total)
// ============================================================================

export const SELF_COMPASSION_QUESTIONS: AssessmentQuestions = {
  type: 'self_compassion',
  title: 'Self-Compassion Scale',
  instructions: [
    'Developed by Dr. Kristin Neff, this measures how you treat yourself during difficult times.',
    'Rate how often you behave in the stated manner from 1-5.',
    'Answer based on your typical patterns, not how you think you "should" respond.',
  ],
  scale: {
    min: 1,
    max: 5,
    labels: ['Almost Never', 'Rarely', 'Sometimes', 'Often', 'Almost Always'],
  },
  questions: [
    { id: 0, text: "I'm disapproving and judgmental about my own flaws and inadequacies.", subscale: 'Self-Judgment' },
    { id: 1, text: "When I'm feeling down I tend to obsess and fixate on everything that's wrong.", subscale: 'Over-Identification' },
    { id: 2, text: 'When things are going badly for me, I see the difficulties as part of life that everyone goes through.', subscale: 'Common Humanity' },
    { id: 3, text: 'When I think about my inadequacies, it tends to make me feel more separate and cut off from the rest of the world.', subscale: 'Isolation' },
    { id: 4, text: "I try to be loving towards myself when I'm feeling emotional pain.", subscale: 'Self-Kindness' },
    { id: 5, text: 'When I fail at something important to me I become consumed by feelings of inadequacy.', subscale: 'Over-Identification' },
    { id: 6, text: "When I'm down and out, I remind myself that there are lots of other people in the world feeling like I am.", subscale: 'Common Humanity' },
    { id: 7, text: 'When times are really difficult, I tend to be tough on myself.', subscale: 'Self-Judgment' },
    { id: 8, text: 'When something upsets me I try to keep my emotions in balance.', subscale: 'Mindfulness' },
    { id: 9, text: 'When I feel inadequate in some way, I try to remind myself that feelings of inadequacy are shared by most people.', subscale: 'Common Humanity' },
    { id: 10, text: "I'm intolerant and impatient towards those aspects of my personality I don't like.", subscale: 'Self-Judgment' },
    { id: 11, text: "When I'm going through a very hard time, I give myself the caring and tenderness I need.", subscale: 'Self-Kindness' },
    { id: 12, text: "When I'm feeling down, I tend to feel like most other people are probably happier than I am.", subscale: 'Isolation' },
    { id: 13, text: 'When something painful happens I try to take a balanced view of the situation.', subscale: 'Mindfulness' },
    { id: 14, text: 'I try to see my failings as part of the human condition.', subscale: 'Common Humanity' },
    { id: 15, text: "When I see aspects of myself that I don't like, I get down on myself.", subscale: 'Self-Judgment' },
    { id: 16, text: 'When I fail at something important to me I try to keep things in perspective.', subscale: 'Mindfulness' },
    { id: 17, text: "When I'm really struggling, I tend to feel like other people must be having an easier time of it.", subscale: 'Isolation' },
    { id: 18, text: "I'm kind to myself when I'm experiencing suffering.", subscale: 'Self-Kindness' },
    { id: 19, text: 'When something upsets me I get carried away with my feelings.', subscale: 'Over-Identification' },
    { id: 20, text: "I can be a bit cold-hearted towards myself when I'm experiencing suffering.", subscale: 'Self-Judgment' },
    { id: 21, text: "When I'm feeling down I try to approach my feelings with curiosity and openness.", subscale: 'Mindfulness' },
    { id: 22, text: "I'm tolerant of my own flaws and inadequacies.", subscale: 'Self-Kindness' },
    { id: 23, text: 'When something painful happens I tend to blow the incident out of proportion.', subscale: 'Over-Identification' },
    { id: 24, text: "When I fail at something that's important to me, I tend to feel alone in my failure.", subscale: 'Isolation' },
    { id: 25, text: "I try to be understanding and patient towards those aspects of my personality I don't like.", subscale: 'Self-Kindness' },
  ],
};

// ============================================================================
// Strengths Profile - Strength Names by Family
// ============================================================================

export const STRENGTHS_BY_FAMILY = {
  being: [
    'Authenticity', 'Centred', 'Courage', 'Curiosity', 'Gratitude',
    'Humility', 'Legacy', 'Mission', 'Moral Compass', 'Personal Responsibility',
    'Pride', 'Self-awareness', 'Service', 'Unconditionality',
  ],
  communicating: [
    'Counterpoint', 'Explainer', 'Feedback', 'Humour', 'Listener',
    'Narrator', 'Spotlight', 'Writer',
  ],
  motivating: [
    'Action', 'Adventure', 'Bounceback', 'Catalyst', 'Change Agent',
    'Competitive', 'Drive', 'Growth', 'Improver', 'Persistence',
    'Resilience', 'Self-belief', 'Work Ethic',
  ],
  relating: [
    'Compassion', 'Connector', 'Emotional Awareness', 'Empathic', 'Enabler',
    'Equality', 'Esteem Builder', 'Personalisation', 'Persuasion',
    'Rapport Builder', 'Relationship Deepener',
  ],
  thinking: [
    'Adaptable', 'Adherence', 'Creativity', 'Detail', 'Incubator',
    'Innovation', 'Judgement', 'Optimism', 'Organiser', 'Planner',
    'Prevention', 'Resolver', 'Strategic Awareness', 'Time Optimiser',
  ],
};

export const ALL_STRENGTHS = Object.values(STRENGTHS_BY_FAMILY).flat();

// ============================================================================
// Values List (Brené Brown Dare to Lead)
// ============================================================================

export const VALUES_LIST = [
  'Accountability', 'Achievement', 'Adaptability', 'Adventure', 'Altruism',
  'Ambition', 'Authenticity', 'Balance', 'Beauty', 'Being the Best',
  'Belonging', 'Career', 'Caring', 'Collaboration', 'Commitment',
  'Community', 'Compassion', 'Competence', 'Confidence', 'Connection',
  'Contentment', 'Contribution', 'Cooperation', 'Courage', 'Creativity',
  'Curiosity', 'Dignity', 'Diversity', 'Environment', 'Efficiency',
  'Equality', 'Ethics', 'Excellence', 'Fairness', 'Faith',
  'Family', 'Financial Stability', 'Forgiveness', 'Freedom', 'Friendship',
  'Fun', 'Future Generations', 'Generosity', 'Giving Back', 'Grace',
  'Gratitude', 'Growth', 'Harmony', 'Health', 'Home',
  'Honesty', 'Hope', 'Humility', 'Humor', 'Inclusion',
  'Independence', 'Initiative', 'Integrity', 'Intuition', 'Job Security',
  'Joy', 'Justice', 'Kindness', 'Knowledge', 'Leadership',
  'Learning', 'Legacy', 'Leisure', 'Love', 'Loyalty',
  'Making a Difference', 'Nature', 'Openness', 'Optimism', 'Order',
  'Parenting', 'Patience', 'Patriotism', 'Peace', 'Perseverance',
  'Personal Fulfillment', 'Power', 'Pride', 'Recognition', 'Reliability',
  'Resourcefulness', 'Respect', 'Responsibility', 'Risk-Taking', 'Safety',
  'Security', 'Self-Discipline', 'Self-Expression', 'Self-Respect', 'Serenity',
  'Service', 'Simplicity', 'Spirituality', 'Sportsmanship', 'Stewardship',
  'Success', 'Teamwork', 'Thrift', 'Time', 'Tradition',
  'Travel', 'Trust', 'Truth', 'Understanding', 'Uniqueness',
  'Usefulness', 'Vision', 'Vulnerability', 'Wealth', 'Well-being',
  'Wholeheartedness', 'Wisdom', 'Writing',
];

// ============================================================================
// Get Questions by Type
// ============================================================================

export function getQuestionsForType(type: string): AssessmentQuestions | null {
  switch (type) {
    case 'executive_function':
      return EXECUTIVE_FUNCTION_QUESTIONS;
    case 'self_compassion':
      return SELF_COMPASSION_QUESTIONS;
    default:
      return null;
  }
}
