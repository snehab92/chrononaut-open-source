import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";

// Slash command items
export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: { chain: () => { focus: () => { insertContent: (content: unknown) => { run: () => void } } } }) => void;
}

const slashCommandItems: SlashCommandItem[] = [
  {
    title: "Meeting Transcription",
    description: "Add real-time meeting transcription widget",
    icon: "🎙️",
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "meetingWidget",
          attrs: { meetingNoteId: null },
        })
        .run();
    },
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    command: (editor) => {
      editor.chain().focus().insertContent({ type: "heading", attrs: { level: 1 } }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    command: (editor) => {
      editor.chain().focus().insertContent({ type: "heading", attrs: { level: 2 } }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: "•",
    command: (editor) => {
      editor.chain().focus().insertContent({ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] }).run();
    },
  },
  {
    title: "Divider",
    description: "Insert a horizontal line",
    icon: "—",
    command: (editor) => {
      editor.chain().focus().insertContent({ type: "horizontalRule" }).run();
    },
  },
];

// Render suggestion dropdown
function renderSuggestion() {
  let component: HTMLElement | null = null;
  let popup: TippyInstance | null = null;
  let selectedIndex = 0;
  let items: SlashCommandItem[] = [];
  let commandFn: ((item: SlashCommandItem) => void) | null = null;

  const updateSelection = () => {
    if (!component) return;
    const buttons = component.querySelectorAll("button");
    buttons.forEach((btn, i) => {
      if (i === selectedIndex) {
        btn.classList.add("bg-[#E8DCC4]");
      } else {
        btn.classList.remove("bg-[#E8DCC4]");
      }
    });
  };

  return {
    onStart: (props: { clientRect: () => DOMRect | null; command: (item: SlashCommandItem) => void; items: SlashCommandItem[] }) => {
      items = props.items;
      commandFn = props.command;
      selectedIndex = 0;

      component = document.createElement("div");
      component.className =
        "bg-white rounded-lg shadow-lg border border-[#E8DCC4] p-1 min-w-[200px] max-h-[300px] overflow-y-auto";

      items.forEach((item) => {
        const button = document.createElement("button");
        button.className =
          "w-full flex items-center gap-2 px-3 py-2 rounded text-left hover:bg-[#F5F0E6] transition-colors";
        button.innerHTML = `
          <span class="w-6 h-6 flex items-center justify-center text-sm">${item.icon}</span>
          <div class="flex flex-col">
            <span class="text-sm font-medium text-[#1E3D32]">${item.title}</span>
            <span class="text-xs text-[#8B9A8F]">${item.description}</span>
          </div>
        `;
        button.onclick = () => {
          if (commandFn) commandFn(item);
        };
        component?.appendChild(button);
      });

      updateSelection();

      popup = tippy(document.body, {
        getReferenceClientRect: props.clientRect as () => DOMRect,
        appendTo: () => document.body,
        content: component,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },

    onUpdate: (props: { clientRect: () => DOMRect | null; items: SlashCommandItem[] }) => {
      items = props.items;

      if (popup) {
        popup.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      }
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "ArrowUp") {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelection();
        return true;
      }

      if (props.event.key === "ArrowDown") {
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelection();
        return true;
      }

      if (props.event.key === "Enter") {
        if (items[selectedIndex] && commandFn) {
          commandFn(items[selectedIndex]);
        }
        return true;
      }

      return false;
    },

    onExit: () => {
      if (popup) {
        popup.destroy();
        popup = null;
      }
      component = null;
    },
  };
}

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }: { editor: unknown; range: { from: number; to: number }; props: SlashCommandItem }) => {
          // Delete the slash command text
          const editorInstance = editor as { chain: () => { focus: () => { deleteRange: (range: { from: number; to: number }) => { run: () => void } } } };
          editorInstance.chain().focus().deleteRange(range).run();
          // Execute the command
          props.command(editor as { chain: () => { focus: () => { insertContent: (content: unknown) => { run: () => void } } } });
        },
        items: ({ query }: { query: string }) => {
          return slashCommandItems.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: renderSuggestion,
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
