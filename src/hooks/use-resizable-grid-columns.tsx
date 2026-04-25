"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

type ResizeMode = "balance" | "push";

/**
 * Persisted pixel widths for grid columns.
 * - `balance`: keeps total width stable by growing left and shrinking right.
 * - `push`: grows/shrinks only the left column, pushing the rest of the grid.
 */
export function useResizableGridColumns(
  storageKey: string,
  defaults: number[],
  options?: { mode?: ResizeMode },
) {
  const [widths, setWidths] = useState<number[]>(() => [...defaults]);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const arr = JSON.parse(raw) as unknown[];
      if (!Array.isArray(arr) || arr.length !== defaults.length) return;
      setWidths(
        defaults.map((d, i) => {
          const n = Number(arr[i]);
          return Number.isFinite(n) && n >= 40 ? n : d;
        }),
      );
    } catch {
      /* ignore */
    }
  }, [storageKey, defaults.length]);

  const startResize = useCallback(
    (leftIndex: number, e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const start = [...widthsRef.current];
      const current = [...start];
      const onMove = (ev: globalThis.MouseEvent) => {
        const dx = ev.clientX - startX;
        const left = start[leftIndex] ?? 48;
        const mode: ResizeMode = options?.mode ?? "balance";
        current[leftIndex] = Math.max(48, left + dx);
        if (mode === "balance") {
          const right = start[leftIndex + 1] ?? 48;
          current[leftIndex + 1] = Math.max(48, right - dx);
        }
        setWidths([...current]);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        try {
          localStorage.setItem(storageKey, JSON.stringify(current));
        } catch {
          /* ignore */
        }
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [storageKey, options?.mode],
  );

  return { widths, startResize };
}

export function GridColResizeHandle({
  onMouseDown,
}: {
  onMouseDown: (e: ReactMouseEvent) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      className="group relative z-10 -mx-0.5 w-3 shrink-0 cursor-col-resize select-none"
    >
      <div className="mx-1 h-4 w-px bg-border/60 group-hover:bg-primary group-active:bg-primary" />
    </div>
  );
}
