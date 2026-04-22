"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

type CycleStatus = "planned" | "active" | "closed" | "archived";

interface CreateCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayYmd(): string {
  return formatLocalYmd(new Date());
}

function inferCycleStatus(startDate: string, endDate: string): CycleStatus {
  const t = todayYmd();
  if (endDate < t) return "closed";
  if (startDate > t) return "planned";
  return "active";
}

function inclusiveCalendarDays(startYmd: string, endYmd: string): number | null {
  if (!startYmd || !endYmd || endYmd < startYmd) return null;
  const a = new Date(`${startYmd}T12:00:00`);
  const b = new Date(`${endYmd}T12:00:00`);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000) + 1;
}

function durationHint(days: number): string {
  if (days >= 88 && days <= 95) return "~1 trimestre";
  if (days >= 178 && days <= 188) return "~1 semestre";
  if (days >= 360 && days <= 372) return "~1 ano";
  return "";
}

function getCurrentQuarterRange(now = new Date()): { start: string; end: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const q = Math.floor(m / 3);
  const start = new Date(y, q * 3, 1);
  const end = new Date(y, q * 3 + 3, 0);
  return { start: formatLocalYmd(start), end: formatLocalYmd(end) };
}

function getCurrentSemesterRange(now = new Date()): { start: string; end: string } {
  const y = now.getFullYear();
  const half = now.getMonth() < 6 ? 0 : 1;
  const start = new Date(y, half * 6, 1);
  const end = new Date(y, half * 6 + 6, 0);
  return { start: formatLocalYmd(start), end: formatLocalYmd(end) };
}

function getCurrentYearRange(now = new Date()): { start: string; end: string } {
  const y = now.getFullYear();
  const start = new Date(y, 0, 1);
  const end = new Date(y, 11, 31);
  return { start: formatLocalYmd(start), end: formatLocalYmd(end) };
}

const STATUS_LABELS: Record<CycleStatus, string> = {
  planned: "Planejado",
  active: "Ativo",
  closed: "Fechado",
  archived: "Arquivado",
};

export function CreateCycleDialog({ open, onOpenChange }: CreateCycleDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<CycleStatus>("planned");
  const [statusPinned, setStatusPinned] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/okr/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao criar ciclo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
      emitOpenChange(false);
    },
  });

  function resetForm() {
    setTitle("");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setStatus("planned");
    setStatusPinned(false);
  }

  function emitOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) resetForm();
  }

  useEffect(() => {
    if (!startDate || !endDate || endDate < startDate) return;
    if (statusPinned) return;
    setStatus(inferCycleStatus(startDate, endDate));
  }, [startDate, endDate, statusPinned]);

  const dateOrderError =
    startDate && endDate && endDate < startDate
      ? "A data de fim não pode ser anterior ao início."
      : "";

  const durationDays = useMemo(
    () =>
      startDate && endDate && !dateOrderError ? inclusiveCalendarDays(startDate, endDate) : null,
    [startDate, endDate, dateOrderError],
  );

  const durationExtra = durationDays != null ? durationHint(durationDays) : "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate || dateOrderError) return;
    mutation.mutate({
      title: title.trim(),
      startDate,
      endDate,
      description: description.trim() || undefined,
      status,
    });
  }

  const canSubmit = Boolean(
    title.trim() && startDate && endDate && !dateOrderError && !mutation.isPending,
  );

  return (
    <Dialog open={open} onOpenChange={emitOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo ciclo OKR</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Q1 2026"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Exemplos: Q1 2026, 1º semestre 2026, Ciclo anual 2026
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="w-full text-xs font-medium text-muted-foreground">
              Atalhos de período
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                const { start, end } = getCurrentQuarterRange();
                setStartDate(start);
                setEndDate(end);
                setStatusPinned(false);
              }}
            >
              Trimestre
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                const { start, end } = getCurrentSemesterRange();
                setStartDate(start);
                setEndDate(end);
                setStatusPinned(false);
              }}
            >
              Semestre
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                const { start, end } = getCurrentYearRange();
                setStartDate(start);
                setEndDate(end);
                setStatusPinned(false);
              }}
            >
              Ano
            </Button>
            <p className="w-full text-[11px] leading-snug text-muted-foreground">
              Preenche início e fim com o período corrente no calendário (trimestre, semestre ou ano
              civil).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Início <span className="text-destructive">*</span>
              </Label>
              <DateField
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setStatusPinned(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Fim <span className="text-destructive">*</span>
              </Label>
              <DateField
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setStatusPinned(false);
                }}
              />
              {dateOrderError ? <p className="text-xs text-destructive">{dateOrderError}</p> : null}
            </div>
          </div>

          {durationDays != null && (
            <p className="text-xs text-muted-foreground">
              Duração:{" "}
              <span className="font-medium text-foreground">
                {durationDays} {durationDays === 1 ? "dia" : "dias"}
              </span>
              {durationExtra ? (
                <>
                  {" "}
                  <span className="text-muted-foreground/90">({durationExtra})</span>
                </>
              ) : null}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as CycleStatus);
                setStatusPinned(true);
              }}
            >
              {(Object.keys(STATUS_LABELS) as CycleStatus[]).map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABELS[k]}
                </option>
              ))}
            </select>
            {statusPinned && startDate && endDate && !dateOrderError ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                Para estas datas, a sugestão automática é{" "}
                <span className="text-foreground/90">
                  {STATUS_LABELS[inferCycleStatus(startDate, endDate)]}
                </span>
                .{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => {
                    setStatusPinned(false);
                    setStatus(inferCycleStatus(startDate, endDate));
                  }}
                >
                  Aplicar sugestão
                </button>
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>
              Descrição <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Contexto do ciclo, foco estratégico e observações…"
              className={cn(
                "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors",
                "min-h-[4.5rem] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => emitOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {mutation.isPending ? "Criando ciclo…" : "Criar ciclo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
