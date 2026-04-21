"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Package,
  WandSparkles,
  X,
  FileJson2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { INGESTION_TEMPLATES } from "@/features/ingestion/lib/ingestion-templates";
import { IngestionFieldReferencePanel } from "@/features/ingestion/components/ingestion-field-reference-panel";
import type { ValidationResult, IngestionResult } from "@/lib/services/ingestion.service";
import { INGESTION_TYPE_LABELS } from "@/lib/schemas/ingestion.schemas";
import type { IngestionObjectType } from "@/lib/schemas/ingestion.schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "edit" | "validated" | "result";

interface IngestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function parseJsonSafe(text: string): { ok: boolean; error: string | null } {
  if (!text.trim()) return { ok: false, error: null };
  try {
    JSON.parse(text);
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof SyntaxError ? e.message : "JSON inválido" };
  }
}

const TYPE_ICON_COLOR: Record<IngestionObjectType, string> = {
  okr_cycle: "text-violet-500",
  okr_objective: "text-indigo-500",
  okr_key_result: "text-blue-500",
  project: "text-emerald-500",
  milestone: "text-amber-500",
  task: "text-sky-500",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ValidationPanel({ result }: { result: ValidationResult }) {
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Summary */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
        {result.valid ? (
          <>
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Payload válido</p>
              <p className="text-xs text-muted-foreground">
                {result.summary.total} objeto{result.summary.total !== 1 ? "s" : ""} prontos para
                ingestão
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {result.errors.length} erro{result.errors.length !== 1 ? "s" : ""} encontrado
                {result.errors.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Corrija os erros antes de executar a ingestão
              </p>
            </div>
          </>
        )}
      </div>

      {/* By type */}
      {Object.keys(result.summary.byType).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Objetos a criar
          </p>
          <div className="flex flex-col gap-1">
            {(Object.entries(result.summary.byType) as [IngestionObjectType, number][]).map(
              ([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-muted/60"
                >
                  <span className={cn("font-medium", TYPE_ICON_COLOR[type])}>
                    {INGESTION_TYPE_LABELS[type] ?? type}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {count}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Erros
          </p>
          <div className="flex flex-col gap-2">
            {result.errors.map((err, i) => (
              <div
                key={i}
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
              >
                {err.objectIndex !== undefined && (
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive/70">
                    Objeto #{err.objectIndex + 1}
                    {err.objectType
                      ? ` · ${INGESTION_TYPE_LABELS[err.objectType] ?? err.objectType}`
                      : ""}
                    {err.clientRef ? ` · ref: ${err.clientRef}` : ""}
                  </p>
                )}
                <p className="text-xs text-destructive">{err.message}</p>
                {err.field && (
                  <p className="mt-0.5 font-mono text-[10px] text-destructive/60">{err.field}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Avisos
          </p>
          <div className="flex flex-col gap-2">
            {result.warnings.map((w, i) => (
              <div
                key={i}
                className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2"
              >
                <p className="text-xs text-amber-700 dark:text-amber-400">{w.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: IngestionResult }) {
  return (
    <div className="flex h-full flex-col gap-4">
      {/* Summary */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
        {result.failed === 0 ? (
          <>
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Ingestão concluída</p>
              <p className="text-xs text-muted-foreground">
                {result.created} objeto{result.created !== 1 ? "s" : ""} criado
                {result.created !== 1 ? "s" : ""} com sucesso
              </p>
            </div>
          </>
        ) : result.created === 0 ? (
          <>
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Ingestão falhou</p>
              <p className="text-xs text-muted-foreground">
                Nenhum objeto foi criado. Verifique os erros abaixo.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Ingestão parcial</p>
              <p className="text-xs text-muted-foreground">
                {result.created} criado{result.created !== 1 ? "s" : ""}, {result.failed} falharam
              </p>
            </div>
          </>
        )}
      </div>

      {/* Items */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resultados por objeto
        </p>
        <div className="flex flex-col gap-1.5">
          {result.items.map((item, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2.5 rounded-md border px-3 py-2",
                item.status === "created"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-destructive/20 bg-destructive/5",
              )}
            >
              {item.status === "created" ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">
                  {INGESTION_TYPE_LABELS[item.type] ?? item.type}
                  {item.clientRef && (
                    <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                      ref: {item.clientRef}
                    </span>
                  )}
                </p>
                {item.id && (
                  <p className="font-mono text-[10px] text-muted-foreground">ID: {item.id}</p>
                )}
                {item.error && <p className="mt-0.5 text-[11px] text-destructive">{item.error}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function IngestionModal({ open, onOpenChange }: IngestionModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("edit");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [ingestionResult, setIngestionResult] = useState<IngestionResult | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setJsonText("");
      setParseError(null);
      setStep("edit");
      setValidationResult(null);
      setIngestionResult(null);
      setTemplateOpen(false);
    }, 200);
  }, [onOpenChange]);

  const handleJsonChange = useCallback(
    (text: string) => {
      setJsonText(text);
      setParseError(null);
      if (step !== "edit") setStep("edit");
      if (text.trim()) {
        const { error } = parseJsonSafe(text);
        if (error) setParseError(error);
      }
    },
    [step],
  );

  const handleFormat = useCallback(() => {
    const formatted = formatJson(jsonText);
    setJsonText(formatted);
    setParseError(null);
  }, [jsonText]);

  const handleLoadTemplate = useCallback((templateId: string) => {
    const tpl = INGESTION_TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setJsonText(JSON.stringify(tpl.payload, null, 2));
      setParseError(null);
      setStep("edit");
      setValidationResult(null);
    }
    setTemplateOpen(false);
  }, []);

  const validateMutation = useMutation({
    mutationFn: async () => {
      const { ok, error } = parseJsonSafe(jsonText);
      if (!ok) throw new Error(error ?? "JSON inválido");
      const payload = JSON.parse(jsonText);
      const res = await fetch("/api/ingestion/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Erro ao validar");
      return json.data as ValidationResult;
    },
    onSuccess: (data) => {
      setValidationResult(data);
      setStep("validated");
    },
    onError: (err) => {
      setParseError(err instanceof Error ? err.message : "Erro ao validar");
    },
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const payload = JSON.parse(jsonText);
      const res = await fetch("/api/ingestion/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok && res.status !== 207) {
        throw new Error(json?.error?.message ?? "Erro ao executar ingestão");
      }
      return json.data as IngestionResult;
    },
    onSuccess: (data) => {
      setIngestionResult(data);
      setStep("result");
    },
    onError: (err) => {
      setParseError(err instanceof Error ? err.message : "Erro ao executar ingestão");
    },
  });

  const canValidate = !!jsonText.trim() && !parseError && step !== "result";
  const canExecute =
    step === "validated" && !!validationResult?.valid && !executeMutation.isPending;

  const rightPanelTitle =
    step === "result" ? "Resultado" : step === "validated" ? "Validação" : "Validação";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 flex w-[min(92vw,1080px)] translate-x-[-50%] translate-y-[-50%] flex-col",
            "overflow-hidden rounded-xl border border-border bg-background shadow-2xl",
            "data-[state=open]:animate-fade-in",
            "h-[min(90vh,720px)]",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Nova ingestão</DialogPrimitive.Title>

          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Nova ingestão</p>
              <p className="truncate text-xs text-muted-foreground">
                Cole um objeto JSON estruturado para criar entidades no sistema de forma validada e
                em lote
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* Templates dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplateOpen((v) => !v)}
                  className="gap-1.5 text-xs"
                >
                  <WandSparkles className="h-3 w-3" />
                  Templates
                  <ChevronDown className="h-3 w-3" />
                </Button>
                {templateOpen && (
                  <div className="absolute right-0 top-full z-10 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                    {INGESTION_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleLoadTemplate(tpl.id)}
                        className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-muted"
                      >
                        <span className="text-xs font-medium text-foreground">{tpl.label}</span>
                        <span className="text-[11px] text-muted-foreground">{tpl.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <DialogPrimitive.Close
                onClick={handleClose}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Left: JSON editor */}
            <div className="flex min-w-0 flex-1 flex-col border-r border-border">
              <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2">
                <div className="flex items-center gap-2">
                  <FileJson2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Payload de ingestão
                  </span>
                  {parseError && (
                    <span className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      JSON inválido
                    </span>
                  )}
                  {!parseError && jsonText.trim() && (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                      JSON válido
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFormat}
                  disabled={!jsonText.trim()}
                  className="h-6 px-2 text-[10px]"
                >
                  Formatar
                </Button>
              </div>

              <div className="relative min-h-0 flex-1">
                <textarea
                  value={jsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  placeholder={`{\n  "version": "1.0",\n  "mode": "create",\n  "objects": []\n}`}
                  spellCheck={false}
                  className={cn(
                    "h-full w-full resize-none bg-[hsl(var(--muted)/0.4)] p-4 font-mono text-[13px] leading-relaxed",
                    "text-foreground placeholder:text-muted-foreground/50",
                    "focus:outline-none",
                    "scrollbar-thin",
                  )}
                  style={{ fontFamily: "ui-monospace, 'Cascadia Code', Menlo, monospace" }}
                />
              </div>

              {parseError && (
                <div className="shrink-0 border-t border-destructive/20 bg-destructive/5 px-4 py-2">
                  <p className="font-mono text-[11px] text-destructive">{parseError}</p>
                </div>
              )}
            </div>

            {/* Right: validation/result panel */}
            <div className="flex w-[min(380px,40vw)] shrink-0 flex-col">
              <div className="flex shrink-0 items-center border-b border-border/60 px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground">{rightPanelTitle}</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {step === "edit" && !validationResult && (
                  <div className="flex h-full min-h-[280px] flex-col gap-3">
                    <p className="text-[11px] text-muted-foreground">
                      Referência de campos <strong className="text-foreground">obrigatórios</strong>
                      , <strong className="text-foreground">opcionais</strong>,{" "}
                      <strong className="text-foreground">condicionais</strong> e listas de{" "}
                      <strong className="text-foreground">enum</strong>. Use também um template ou o
                      JSON Schema para outra IA.
                    </p>
                    <IngestionFieldReferencePanel />
                  </div>
                )}
                {step === "validated" && validationResult && (
                  <ValidationPanel result={validationResult} />
                )}
                {step === "result" && ingestionResult && <ResultPanel result={ingestionResult} />}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3">
            <div className="text-[11px] text-muted-foreground">
              {step === "edit" &&
                "v1.0 · Suporta: ciclos, objetivos, KRs, projetos, milestones, tarefas"}
              {step === "validated" && validationResult && (
                <span>
                  {validationResult.summary.total} objeto
                  {validationResult.summary.total !== 1 ? "s" : ""} ·{" "}
                  {validationResult.errors.length === 0
                    ? "sem erros"
                    : `${validationResult.errors.length} erro${validationResult.errors.length !== 1 ? "s" : ""}`}
                </span>
              )}
              {step === "result" && ingestionResult && (
                <span>
                  {ingestionResult.created} criado{ingestionResult.created !== 1 ? "s" : ""} ·{" "}
                  {ingestionResult.failed} falharam
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>
                {step === "result" ? "Fechar" : "Cancelar"}
              </Button>

              {step !== "result" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => validateMutation.mutate()}
                  disabled={!canValidate || validateMutation.isPending}
                  className="min-w-[80px]"
                >
                  {validateMutation.isPending && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  {validateMutation.isPending ? "Validando…" : "Validar"}
                </Button>
              )}

              {step === "validated" && (
                <Button
                  size="sm"
                  onClick={() => executeMutation.mutate()}
                  disabled={!canExecute || executeMutation.isPending}
                  className="min-w-[100px] gap-1.5"
                >
                  {executeMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Ingerindo…
                    </>
                  ) : (
                    <>
                      <Package className="h-3.5 w-3.5" />
                      Ingerir dados
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
