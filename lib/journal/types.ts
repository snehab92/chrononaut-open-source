// Journal view types

export type JournalViewType = 'entry-feed' | 'photo-of-day' | 'mood-tracker' | 'weekly-reviews';

// Mood enum from PRD
export const MOOD_LABELS = [
  'Threatened', 'Stressed', 'Unfocused', 'Rejected',
  'Creative', 'Adventurous', 'Angry', 'Manic',
  'Calm', 'Content', 'Socially Connected', 'Romantic'
] as const;

export type MoodLabel = typeof MOOD_LABELS[number];

// Mood to emoji + color mapping (shared across all journal views)
// Colors grouped by mood cluster:
// - Positive (green): Creative, Adventurous, Socially Connected, Romantic, Manic
// - Neutral (yellow): Calm, Content
// - Negative (pink/red): Threatened, Stressed, Unfocused, Rejected, Angry
export const MOOD_CONFIG: Record<MoodLabel, { emoji: string; color: string; bgColor: string; chartColor: string }> = {
  // Negative moods - soft pink/rose background
  'Threatened': { emoji: '😰', color: 'text-[#8B5A5A]', bgColor: 'bg-[#F8E8E8]', chartColor: '#C4847F' },
  'Stressed': { emoji: '😣', color: 'text-[#8B5A5A]', bgColor: 'bg-[#F8E8E8]', chartColor: '#D49B8F' },
  'Unfocused': { emoji: '😶‍🌫️', color: 'text-[#8B5A5A]', bgColor: 'bg-[#F8E8E8]', chartColor: '#B89B9B' },
  'Rejected': { emoji: '😢', color: 'text-[#8B5A5A]', bgColor: 'bg-[#F8E8E8]', chartColor: '#A08B9B' },
  'Angry': { emoji: '😠', color: 'text-[#8B5A5A]', bgColor: 'bg-[#F8E8E8]', chartColor: '#B87070' },

  // Neutral/Calm moods - soft golden/yellow background
  'Calm': { emoji: '😌', color: 'text-[#8B7B4B]', bgColor: 'bg-[#FDF6E3]', chartColor: '#C4A84B' },
  'Content': { emoji: '😊', color: 'text-[#8B7B4B]', bgColor: 'bg-[#FDF6E3]', chartColor: '#D4B85B' },

  // Positive moods - light airy green background
  'Creative': { emoji: '✨', color: 'text-[#4B7B5A]', bgColor: 'bg-[#E8F2EB]', chartColor: '#6B9B7A' },
  'Adventurous': { emoji: '🤩', color: 'text-[#4B7B5A]', bgColor: 'bg-[#E8F2EB]', chartColor: '#5C8A6B' },
  'Manic': { emoji: '🤪', color: 'text-[#4B7B5A]', bgColor: 'bg-[#E8F2EB]', chartColor: '#7BAB8A' },
  'Socially Connected': { emoji: '🥰', color: 'text-[#4B7B5A]', bgColor: 'bg-[#E8F2EB]', chartColor: '#4B8B6B' },
  'Romantic': { emoji: '💕', color: 'text-[#4B7B5A]', bgColor: 'bg-[#E8F2EB]', chartColor: '#5B9B7B' },
};

// Journal entry interface
export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  encrypted_happened: string | null;
  encrypted_feelings: string | null;
  encrypted_grateful: string | null;
  encrypted_ai_insights: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  photo_url: string | null;
  tags: string[];
  mood_label: MoodLabel | null;
  mood_override: boolean;
  energy_rating: number | null;
  energy_override: boolean;
  created_at: string;
  updated_at: string;
}

// Stats for Photo of the Day view
export interface JournalStats {
  uniqueLocations: number;
  totalPhotos: number;
  daysWithPhotos: number;
  mostPhotographedLocation: string | null;
  moodBreakdown: MoodCount[];
}

export interface MoodCount {
  mood: MoodLabel;
  count: number;
  percentage: number;
}

// View configuration for sidebar
export interface JournalViewConfig {
  id: JournalViewType;
  label: string;
  icon: string; // Lucide icon name
  description: string;
}

export const JOURNAL_VIEWS: JournalViewConfig[] = [
  { id: 'entry-feed', label: 'Journal', icon: 'BookOpen', description: 'Daily entries' },
  { id: 'photo-of-day', label: 'Photos', icon: 'Camera', description: 'Photo calendar' },
  { id: 'mood-tracker', label: 'Mood', icon: 'Heart', description: 'Mood patterns' },
  { id: 'weekly-reviews', label: 'Reviews', icon: 'FileText', description: 'Weekly reviews' },
];

// Calendar entry for Photo of Day view
export interface CalendarEntry {
  entry_date: string;
  photo_url: string | null;
  location_name: string | null;
  mood_label: MoodLabel | null;
}

// Mood tracker entry
export interface MoodTrackerEntry {
  entry_date: string;
  mood_label: MoodLabel | null;
  encrypted_happened: string | null;
  encrypted_feelings: string | null;
}

// Weekly review entry
export interface WeeklyReviewEntry {
  id: string;
  entry_date: string;
  encrypted_happened: string | null;
  encrypted_ai_insights: string | null;
  tags: string[];
  created_at: string;
}
