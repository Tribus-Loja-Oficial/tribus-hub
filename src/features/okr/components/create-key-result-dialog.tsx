"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateField } from "@/components/ui/date-field";
import {
  nativeSelectClassName,
  nativeTextareaClassName,
} from "@/components/ui/form-control-classes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import type { OkrCycle, OkrObjective } from "@/lib/types/domain";

type ObjectiveWithKRs = OkrObjective & { keyResults: unknown[] };

interface MemberRow {
  id: string;
  name: string;
  email: string;
}

interface CreateKeyResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultObjectiveId?: string;
  defaultCycleId?: string;
}

function calcKrProgress(
  start: number,
  current: number,
  target: number,
  metricType: string,
): number {
  if (metricType === "boolean") return current >= 1 ? 100 : 0;
  const range = target - start;
  if (range === 0) return current >= target ? 100 : 0;
  const progress = ((current - start) / range) * 100;
  return Math.min(100, Math.max(0, progress));
}

type DateErrors = { order?: string; startInCycle?: string; targetInCycle?: string };

export function CreateKeyResultDialog({
  open,
  onOpenChange,
  defaultObjectiveId,
  defaultCycleId,
}: CreateKeyResultDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectiveId, setObjectiveId] = useState(defaultObjectiveId ?? "");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [metricType, setMetricType] = useState("number");
  const [unit, setUnit] = useState("");
  const [startValue, setStartValue] = useState("0");
  const [currentValue, setCurrentValue] = useState("0");
  const [targetValue, setTargetValue] = useState("100");
  const [status, setStatus] = useState("draft");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [confidence, setConfidence] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateErrors, setDateErrors] = useState<DateErrors>({});
  const [valueError, setValueError] = useState("");
  const prevStartRef = useRef(startValue);
  const prevMetricTypeRef = useRef(metricType);

  const { data: objectivesRes } = useQuery<{ data: ObjectiveWithKRs[] }>({
    queryKey: ["okr-objectives"],
    queryFn: () => fetch("/api/okr/objectives").then((r) => r.json()),
    enabled: open,
  });

  const { data: cyclesRes } = useQuery<{ data: OkrCycle[] }>({
    queryKey: ["okr-cycles"],
    queryFn: () => fetch("/api/okr/cycles").then((r) => r.json()),
    enabled: open,
  });

  const { data: membersRes } = useQuery<{ data: MemberRow[] }>({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace/members").then((r) => r.json()),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch("/api/okr/key-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao criar key result");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["okr-key-results"] });
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
      emitOpenChange(false);
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setObjectiveId(defaultObjectiveId ?? "");
    setOwnerUserId("");
    setMetricType("number");
    setUnit("");
    setStartValue("0");
    setCurrentValue("0");
    setTargetValue("100");
    setStatus("draft");
    setStartDate("");
    setTargetDate("");
    setConfidence("");
    setShowAdvanced(false);
    setDateErrors({});
    setValueError("");
    prevStartRef.current = "0";
    prevMetricTypeRef.current = "number";
  }

  function emitOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) resetForm();
  }

  useEffect(() => {
    if (open) {
      setObjectiveId(defaultObjectiveId ?? "");
      setDateErrors({});
      setValueError("");
    }
  }, [open, defaultObjectiveId]);

  useEffect(() => {
    if (metricType === "percentage") setUnit("%");
    else if (metricType === "currency") setUnit("R$");
    else if (metricType === "boolean") setUnit("");
    else setUnit("");
  }, [metricType]);

  useEffect(() => {
    const prev = prevMetricTypeRef.current;
    prevMetricTypeRef.current = metricType;
    if (metricType === "boolean") {
      setStartValue("0");
      setTargetValue("1");
      setCurrentValue((c) => (c === "1" || c === "0" ? c : "0"));
    } else if (prev === "boolean") {
      setStartValue("0");
      setCurrentValue("0");
      setTargetValue("100");
    }
  }, [metricType]);

  const objectives = objectivesRes?.data ?? [];
  const cycles = cyclesRes?.data ?? [];
  const members = membersRes?.data ?? [];

  const selectedObjective = useMemo(
    () => objectives.find((o) => o.id === objectiveId),
    [objectives, objectiveId],
  );

  const inheritedCycleId = selectedObjective?.cycleId ?? undefined;
  const inheritedCycle = useMemo(
    () => cycles.find((c) => c.id === inheritedCycleId),
    [cycles, inheritedCycleId],
  );

  const effectiveCycleId = inheritedCycleId ?? defaultCycleId ?? undefined;

  const isBoolean = metricType === "boolean";
  const startNum = parseFloat(startValue);
  const currentNum = parseFloat(currentValue);
  const targetNum = parseFloat(targetValue);
  const numsOk = !Number.isNaN(startNum) && !Number.isNaN(currentNum) && !Number.isNaN(targetNum);

  const progressPreview = numsOk
    ? Math.round(calcKrProgress(startNum, currentNum, targetNum, metricType) * 10) / 10
    : null;

  const valueHint = useMemo(() => {
    if (!numsOk || isBoolean) return null;
    if (targetNum > startNum && currentNum > targetNum) {
      return "Valor atual acima da meta — confira se a meta e o valor inicial estão corretos.";
    }
    if (targetNum < startNum && currentNum < targetNum) {
      return "Valor atual abaixo da meta em métrica decrescente — confira se os valores estão corretos.";
    }
    return null;
  }, [numsOk, isBoolean, startNum, currentNum, targetNum]);

  function handleStartChange(next: string) {
    const prev = prevStartRef.current;
    if (parseFloat(currentValue) === parseFloat(prev)) {
      setCurrentValue(next);
    }
    prevStartRef.current = next;
    setStartValue(next);
  }

  function applyDateValidation(): boolean {
    const next: DateErrors = {};
    if (startDate && targetDate && startDate > targetDate) {
      next.order = "A data de início não pode ser depois da data-alvo.";
    }
    const cycle = inheritedCycle;
    if (cycle) {
      if (startDate && (startDate < cycle.startDate || startDate > cycle.endDate)) {
        next.startInCycle = `O início deve ficar entre ${cycle.startDate} e ${cycle.endDate} (ciclo do objetivo).`;
      }
      if (targetDate && (targetDate < cycle.startDate || targetDate > cycle.endDate)) {
        next.targetInCycle = `A data-alvo deve ficar entre ${cycle.startDate} e ${cycle.endDate} (ciclo do objetivo).`;
      }
    }
    setDateErrors(next);
    if (Object.keys(next).length > 0) setShowAdvanced(true);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !objectiveId) return;

    if (!isBoolean) {
      if (targetValue.trim() === "" || Number.isNaN(parseFloat(targetValue))) {
        setValueError("Informe um valor-alvo numérico.");
        return;
      }
    }
    setValueError("");

    if (!applyDateValidation()) return;

    const confParsed = confidence.trim() === "" ? undefined : parseInt(confidence, 10);
    if (
      confParsed !== undefined &&
      (Number.isNaN(confParsed) || confParsed < 0 || confParsed > 100)
    ) {
      setShowAdvanced(true);
      return;
    }

    mutation.mutate({
      title: title.trim(),
      descriptionText: description.trim() || undefined,
      objectiveId,
      cycleId: effectiveCycleId,
      ownerUserId: ownerUserId || undefined,
      metricType,
      unit: unit.trim() || undefined,
      startValue: parseFloat(startValue) || 0,
      currentValue: isBoolean ? parseFloat(currentValue) || 0 : parseFloat(currentValue) || 0,
      targetValue: isBoolean ? 1 : parseFloat(targetValue),
      status,
      startDate: startDate || undefined,
      targetDate: targetDate || undefined,
      confidence: confParsed,
    });
  }

  const valueStep =
    metricType === "currency" ? "0.01" : metricType === "percentage" ? "0.1" : "any";

  return (
    <Dialog open={open} onOpenChange={emitOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo key result</DialogTitle>
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
              placeholder="Ex.: Atingir 200 clientes ativos"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Key result deve ser{" "}
              <strong className="font-medium text-foreground/80">mensurável e verificável</strong>.
              Ex.: &quot;Atingir 200 clientes ativos&quot; ou &quot;Elevar conversão para
              3,5%&quot;.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>
              Descrição <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva a regra de medição, fonte do dado e critério de sucesso."
              className={cn(nativeTextareaClassName, "min-h-[4.5rem]")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Objetivo <span className="text-destructive">*</span>
              </Label>
              <select
                className={nativeSelectClassName}
                value={objectiveId}
                onChange={(e) => {
                  setObjectiveId(e.target.value);
                  setDateErrors({});
                }}
              >
                <option value="">Selecione o objetivo vinculado…</option>
                {objectives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
              {objectiveId && (
                <p className="text-xs text-muted-foreground">
                  {inheritedCycle ? (
                    <>
                      Ciclo herdado:{" "}
                      <span className="text-foreground/90">{inheritedCycle.title}</span>
                    </>
                  ) : (
                    <>Sem ciclo vinculado ao objetivo</>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <select
                className={nativeSelectClassName}
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
              >
                <option value="">Sem responsável</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={cn("grid gap-3", isBoolean ? "grid-cols-1" : "grid-cols-2")}>
            <div className="space-y-1.5">
              <Label>Tipo de métrica</Label>
              <select
                className={nativeSelectClassName}
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
              >
                <option value="number">Número</option>
                <option value="percentage">Percentual</option>
                <option value="currency">Moeda</option>
                <option value="boolean">Sim/Não</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>

            {!isBoolean && (
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={
                    metricType === "currency"
                      ? "Ex.: R$, mil R$"
                      : metricType === "percentage"
                        ? "Ex.: %"
                        : "Ex.: clientes, leads, tickets"
                  }
                />
              </div>
            )}
          </div>

          {isBoolean ? (
            <div className="space-y-1.5 rounded-lg border border-border/70 bg-muted/25 p-3 shadow-inset">
              <Label>Situação atual</Label>
              <select
                className={nativeSelectClassName}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
              >
                <option value="0">Não atingido</option>
                <option value="1">Atingido</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Meta fixa: resultado &quot;sim&quot; (1). Ajuste apenas o estado atual.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step={valueStep}
                  value={startValue}
                  onChange={(e) => handleStartChange(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <Label>Atual</Label>
                  <button
                    type="button"
                    className="shrink-0 text-[10px] font-medium text-primary hover:underline"
                    onClick={() => setCurrentValue(startValue)}
                  >
                    Igual ao início
                  </button>
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  step={valueStep}
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor-alvo</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step={valueStep}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                />
              </div>
            </div>
          )}

          {valueError && <p className="text-xs text-destructive">{valueError}</p>}

          {!isBoolean && progressPreview !== null && numsOk && (
            <p className="text-xs text-muted-foreground">
              Progresso estimado:{" "}
              <span className="font-medium text-foreground">{progressPreview}%</span> (com base em
              início, atual e valor-alvo)
            </p>
          )}

          {valueHint && (
            <p className="text-xs text-amber-700 dark:text-amber-500/90">{valueHint}</p>
          )}

          <div>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? "Ocultar opções avançadas" : "Mostrar opções avançadas"}
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-4 rounded-lg border border-border/70 bg-muted/25 p-3 shadow-inset">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    className={nativeSelectClassName}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="draft">Rascunho</option>
                    <option value="on_track">No rumo</option>
                    <option value="at_risk">Em risco</option>
                    <option value="off_track">Fora do rumo</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Início (data)</Label>
                    <DateField
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDateErrors({});
                      }}
                    />
                    {dateErrors.startInCycle && (
                      <p className="text-xs text-destructive">{dateErrors.startInCycle}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data-alvo</Label>
                    <DateField
                      value={targetDate}
                      onChange={(e) => {
                        setTargetDate(e.target.value);
                        setDateErrors({});
                      }}
                    />
                    {dateErrors.targetInCycle && (
                      <p className="text-xs text-destructive">{dateErrors.targetInCycle}</p>
                    )}
                  </div>
                </div>
                {dateErrors.order && <p className="text-xs text-destructive">{dateErrors.order}</p>}

                <div className="space-y-1.5">
                  <Label>
                    Confiança{" "}
                    <span className="text-xs text-muted-foreground">(opcional, 0–100)</span>
                  </Label>
                  <select
                    className={nativeSelectClassName}
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                  >
                    <option value="">Não informar</option>
                    <option value="25">Baixa (25)</option>
                    <option value="50">Média (50)</option>
                    <option value="75">Alta (75)</option>
                    <option value="90">Muito alta (90)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Você poderá registrar atualizações de valor e comentários depois que o KR existir.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={() => emitOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim() || !objectiveId || mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {mutation.isPending ? "Criando…" : "Criar key result"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
