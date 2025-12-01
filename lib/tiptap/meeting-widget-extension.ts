import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import type { ComponentType } from "react";

// The actual React component will be imported dynamically to avoid SSR issues
// This extension defines the node schema and behavior

export interface MeetingWidgetOptions {
  HTMLAttributes: Record<string, unknown>;
}

// Props passed to the meeting widget component
export type MeetingWidgetComponentProps = NodeViewProps;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    meetingWidget: {
      /**
       * Insert a meeting transcription widget
       */
      insertMeetingWidget: (attrs?: {
        meetingNoteId?: string | null;
        calendarEventId?: string | null;
      }) => ReturnType;
    };
  }
}

export const MeetingWidgetExtension = Node.create<MeetingWidgetOptions>({
  name: "meetingWidget",

  // Block-level element
  group: "block",

  // Cannot be partially selected or edited
  atom: true,

  // Can be dragged
  draggable: true,

  // Isolate content (not editable as text)
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      meetingNoteId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-meeting-note-id"),
        renderHTML: (attributes) => {
          if (!attributes.meetingNoteId) {
            return {};
          }
          return {
            "data-meeting-note-id": attributes.meetingNoteId,
          };
        },
      },
      calendarEventId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-calendar-event-id"),
        renderHTML: (attributes) => {
          if (!attributes.calendarEventId) {
            return {};
          }
          return {
            "data-calendar-event-id": attributes.calendarEventId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="meeting-widget"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "meeting-widget",
        class: "meeting-widget-container",
      }),
    ];
  },

  addCommands() {
    return {
      insertMeetingWidget:
        (attrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              meetingNoteId: attrs.meetingNoteId || null,
              calendarEventId: attrs.calendarEventId || null,
            },
          });
        },
    };
  },

  // The node view will be set when the component is available
  // This allows us to lazy-load the React component
  addNodeView() {
    // Dynamic import to avoid SSR issues
    // The actual component will be passed via the extension configuration
    return ReactNodeViewRenderer(
      // Placeholder - will be replaced when extension is configured with component
      () => null
    );
  },
});

// Factory function to create extension with React component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createMeetingWidgetExtension(MeetingWidgetComponent: ComponentType<any>) {
  return MeetingWidgetExtension.extend({
    addNodeView() {
      return ReactNodeViewRenderer(MeetingWidgetComponent);
    },
  });
}
