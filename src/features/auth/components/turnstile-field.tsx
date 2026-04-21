"use client";

import { useEffect, useRef } from "react";

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

type TurnstileFieldProps = {
  siteKey: string;
  onChange: (token: string | null) => void;
};

export function TurnstileField({ siteKey, onChange }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return undefined;

    const mount = () => {
      const el = containerRef.current;
      if (!el || !window.turnstile) return;
      if (widgetIdRef.current) {
        window.turnstile.remove?.(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(el, {
        sitekey: siteKey,
        callback: (t) => onChange(t),
        "expired-callback": () => onChange(null),
        "error-callback": () => onChange(null),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (window.turnstile) {
      mount();
    } else if (existing) {
      existing.addEventListener("load", mount, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.addEventListener("load", mount, { once: true });
      document.body.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onChange]);

  if (!siteKey) return null;

  return <div ref={containerRef} className="flex min-h-[65px] justify-center" />;
}
