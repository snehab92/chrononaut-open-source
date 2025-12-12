// Note templates for different note types

export type NoteType = "meeting" | "document" | "quick capture";

export const NOTE_TEMPLATES: Record<NoteType, string> = {
  meeting: `<h2>Meeting Notes</h2>
<p><strong>Date:</strong> </p>
<p><strong>Attendees:</strong> </p>
<p><strong>Purpose:</strong> </p>

<h3>Agenda</h3>
<ul>
  <li></li>
</ul>

<h3>Discussion</h3>
<p></p>

<h3>Action Items</h3>
<ul>
  <li><strong>Who:</strong>  | <strong>What:</strong>  | <strong>By:</strong> </li>
</ul>

<h3>Next Steps</h3>
<p></p>`,

  document: `<h1>Document Title</h1>
<p></p>`,

  "quick capture": `<p></p>`,
};

export function getTemplateForNote(noteType: NoteType): string {
  return NOTE_TEMPLATES[noteType];
}
