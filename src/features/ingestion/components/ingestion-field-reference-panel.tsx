"use client";

import { BookOpen, FileJson } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  INGESTION_ENVELOPE_META,
  INGESTION_TYPE_REFERENCES,
  type FieldRequirement,
} from "@/features/ingestion/lib/ingestion-field-reference";
import { INGESTION_TYPE_LABELS } from "@/lib/schemas/ingestion.schemas";

function ReqBadge({ requirement }: { requirement: FieldRequirement }) {
  const label =
    requirement === "required" ? "Obrig." : requirement === "conditional" ? "Cond." : "Opc.";
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        requirement === "required" && "bg-primary/15 text-primary",
        requirement === "optional" && "bg-muted text-muted-foreground",
        requirement === "conditional" && "bg-amber-500/15 text-amber-800 dark:text-amber-400",
      )}
    >
      {label}
    </span>
  );
}

export function IngestionFieldReferencePanel() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <p className="text-[11px] leading-snug text-muted-foreground">
          <strong className="text-foreground">Envelope</strong> fixo:{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">version</code>{" "}
          <ReqBadge requirement="required" />{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">1.0</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">mode</code>{" "}
          <ReqBadge requirement="required" /> <code className="text-[10px]">create</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">objects</code>{" "}
          <ReqBadge requirement="required" /> {INGESTION_ENVELOPE_META.objects.hint}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href="/ingestion-payload.schema.json"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <FileJson className="h-3 w-3" />
            JSON Schema (IDE / IA)
          </a>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            Doc:{" "}
            <code className="rounded bg-muted px-1">
              docs/reference/ingestion-ai-master-template.md
            </code>
          </span>
        </div>
      </div>

      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Campos por tipo (em <code className="text-[10px]">data</code>)
      </p>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {INGESTION_TYPE_REFERENCES.map((spec) => (
          <details
            key={spec.type}
            className="group rounded-lg border border-border/80 bg-background open:bg-muted/20"
          >
            <summary className="cursor-pointer list-none px-2.5 py-2 text-xs font-medium text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                <span>{INGESTION_TYPE_LABELS[spec.type]}</span>
                <span className="font-mono text-[10px] font-normal text-muted-foreground">
                  {spec.type}
                </span>
              </span>
            </summary>
            <div className="border-t border-border/60 px-2.5 pb-2.5 pt-1">
              <p className="mb-2 text-[10px] text-muted-foreground">{spec.summary}</p>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-1 pr-1 font-medium">Campo</th>
                    <th className="pb-1 pr-1 font-medium">Req.</th>
                    <th className="pb-1 font-medium">Tipo / valores</th>
                  </tr>
                </thead>
                <tbody>
                  {spec.dataFields.map((row) => (
                    <tr key={row.key} className="border-t border-border/40 align-top">
                      <td className="py-1 pr-1 font-mono text-foreground">{row.key}</td>
                      <td className="py-1 pr-1">
                        <ReqBadge requirement={row.requirement} />
                      </td>
                      <td className="py-1 text-muted-foreground">
                        <span className="text-foreground/90">{row.valueType}</span>
                        {row.enumValues && (
                          <span className="mt-0.5 block font-mono text-[9px] leading-tight text-foreground/80">
                            [{row.enumValues.join(" | ")}]
                          </span>
                        )}
                        {row.default && (
                          <span className="mt-0.5 block text-[9px]">padrão: {row.default}</span>
                        )}
                        {row.maxLength && (
                          <span className="mt-0.5 block text-[9px]">
                            máx. {row.maxLength} chars
                          </span>
                        )}
                        {row.condition && (
                          <span className="mt-0.5 block text-[9px] text-amber-700 dark:text-amber-400">
                            {row.condition}
                          </span>
                        )}
                        {row.hint && (
                          <span className="mt-0.5 block text-[9px] italic opacity-90">
                            {row.hint}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
