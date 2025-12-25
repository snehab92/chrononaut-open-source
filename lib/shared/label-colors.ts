/**
 * Shared Label Color System
 *
 * Provides deterministic color assignment for labels/tags
 * based on a hash of the label text.
 */

export interface LabelColorScheme {
  bg: string;
  text: string;
  border: string;
}

// 17 color palette - auto-assigned based on label name hash
export const LABEL_COLORS: LabelColorScheme[] = [
  { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200" },
  { bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-200" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200" },
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200" },
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200" },
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200" },
];

/**
 * Get a deterministic color for a label based on its text.
 * Same label always returns the same color.
 *
 * @param label - The label text
 * @returns Color scheme with bg, text, and border classes
 */
export function getLabelColor(label: string): LabelColorScheme {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

/**
 * Get combined Tailwind classes for a label badge.
 *
 * @param label - The label text
 * @returns Combined className string
 */
export function getLabelClasses(label: string): string {
  const color = getLabelColor(label);
  return `${color.bg} ${color.text} ${color.border}`;
}
