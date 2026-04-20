"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import type { JSONContent } from "@tiptap/core";
import { cn } from "@/lib/utils/cn";
import { EditorToolbar } from "./editor-toolbar";

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface RichEditorProps {
  content?: JSONContent | null;
  onChange?: (json: JSONContent) => void;
  onSave?: (json: JSONContent) => Promise<void>;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  saveStatus?: "idle" | "saving" | "saved" | "error";
}

export function RichEditor({
  content,
  onChange,
  onSave,
  placeholder = "Comece a escrever...",
  editable = true,
  className,
  saveStatus,
}: RichEditorProps) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Placeholder.configure({ placeholder }),
    ],
    content: content ?? undefined,
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange?.(json);

      if (onSave) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          onSave(json);
        }, AUTOSAVE_DEBOUNCE_MS);
      }
    },
  });

  // Sync external content changes
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <div className={cn("flex flex-col", className)}>
      {editable && (
        <div className="flex items-center justify-between mb-2">
          <EditorToolbar editor={editor} />
          {saveStatus && (
            <span
              className={cn("text-xs", {
                "text-muted-foreground": saveStatus === "idle" || saveStatus === "saving",
                "text-green-600": saveStatus === "saved",
                "text-destructive": saveStatus === "error",
              })}
            >
              {saveStatus === "saving" && "Salvando..."}
              {saveStatus === "saved" && "Salvo"}
              {saveStatus === "error" && "Erro ao salvar"}
            </span>
          )}
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm max-w-none flex-1",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed",
          "prose-code:bg-muted prose-code:rounded prose-code:px-1",
          "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
          "focus-within:outline-none",
          "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[200px]",
        )}
      />
    </div>
  );
}
