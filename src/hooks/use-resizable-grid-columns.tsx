"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

/**
 * Persisted pixel widths for adjacent grid columns. Use `startResize(i, e)` to drag
 * the boundary between column `i` and `i + 1` (both must be pixel-based in the template).
 */
export function useResizableGridColumns(storageKey: string, defaults: number[]) {
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
        const right = start[leftIndex + 1] ?? 48;
        current[leftIndex] = Math.max(48, left + dx);
        current[leftIndex + 1] = Math.max(48, right - dx);
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
    [storageKey],
  );

  return { widths, startResize };
}

export function GridColResizeHandle({ onMouseDown }: { onMouseDown: (e: ReactMouseEvent) => void }) {
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
