"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { nativeSelectClassName } from "@/components/ui/form-control-classes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OkrKeyResult } from "@/lib/types/domain";
import { invalidateAfterKeyResultMutation } from "@/lib/query/invalidate-hub-cache";
import { formatOkrProgressPercent } from "@/features/okr/lib/okr-progress-format";
import { OkrProgressBar } from "./okr-progress-bar";

interface UpdateKeyResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResult: OkrKeyResult | null;
  nested?: boolean;
}

export function UpdateKeyResultDialog({
  open,
  onOpenChange,
  keyResult,
  nested = false,
}: UpdateKeyResultDialogProps) {
  const queryClient = useQueryClient();
  const [newValue, setNewValue] = useState("");
  const [comment, setComment] = useState("");

  const isBoolean = keyResult?.metricType === "boolean";

  useEffect(() => {
    if (!open || !keyResult) return;
    setComment("");
    setNewValue(isBoolean ? "" : "0");
  }, [open, keyResult, isBoolean]);

  const mutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch(`/api/okr/key-results/${keyResult?.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao atualizar progresso");
      return res.json();
    },
    onSuccess: () => {
      if (!keyResult) return;
      invalidateAfterKeyResultMutation(queryClient, {
        keyResultId: keyResult.id,
        objectiveId: keyResult.objectiveId,
        cycleId: keyResult.cycleId,
      });
      handleClose();
    },
  });

  function handleClose() {
    onOpenChange(false);
    setNewValue(isBoolean ? "" : "0");
    setComment("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newValue === "" || !keyResult) return;
    const parsed = parseFloat(newValue);
    if (Number.isNaN(parsed)) return;
    const finalValue = isBoolean ? parsed : keyResult.currentValue + parsed;
    mutation.mutate({ newValue: finalValue, comment: comment.trim() || undefined });
  }

  if (!keyResult) return null;

  const parsedInput = parseFloat(newValue);
  const isInputValid = newValue !== "" && !Number.isNaN(parsedInput);
  const deltaValue = isBoolean ? null : parsedInput;
  const finalValue = isInputValid
    ? isBoolean
      ? parsedInput
      : keyResult.currentValue + parsedInput
    : keyResult.currentValue;
  const previewProgress = isInputValid
    ? (() => {
        const sv = keyResult.startValue;
        const tv = keyResult.targetValue;
        const cv = finalValue;
        if (isBoolean) return cv >= 1 ? 100 : 0;
        const range = tv - sv;
        if (range === 0) return cv >= tv ? 100 : 0;
        return Math.min(100, Math.max(0, ((cv - sv) / range) * 100));
      })()
    : keyResult.progressPercent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent nested={nested} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Atualizar progresso</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="truncate text-sm font-medium text-foreground">{keyResult.title}</p>

          <div className="space-y-2 rounded-lg bg-muted/50 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso atual</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatOkrProgressPercent(keyResult.progressPercent)}
              </span>
            </div>
            <OkrProgressBar
              percent={keyResult.progressPercent}
              status={keyResult.status}
              size="sm"
            />
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>
                {keyResult.currentValue}
                {keyResult.unit ? ` ${keyResult.unit}` : ""}
              </span>
              <span>
                meta: {keyResult.targetValue}
                {keyResult.unit ? ` ${keyResult.unit}` : ""}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isBoolean ? (
            <div className="space-y-1.5">
              <Label>Novo valor</Label>
              <select
                className={nativeSelectClassName}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              >
                <option value="">Selecione…</option>
                <option value="0">Não concluído</option>
                <option value="1">Concluído</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>
                Ajuste{keyResult.unit ? ` (${keyResult.unit})` : ""}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Use positivo para aumentar e negativo para reduzir. Ex.:{" "}
                <span className="font-medium text-foreground">10</span> aumenta 10;{" "}
                <span className="font-medium text-foreground">-5</span> reduz 5.
              </p>
            </div>
          )}

          {isInputValid && (
            <div className="space-y-1.5 rounded-lg bg-muted/50 px-3 py-2">
              {!isBoolean && deltaValue !== null && (
                <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                  <span>
                    Atual: {keyResult.currentValue}
                    {keyResult.unit ? ` ${keyResult.unit}` : ""}
                  </span>
                  <span>
                    Ajuste: {deltaValue >= 0 ? "+" : ""}
                    {deltaValue}
                    {keyResult.unit ? ` ${keyResult.unit}` : ""}
                  </span>
                  <span className="font-semibold text-foreground">
                    Final: {finalValue}
                    {keyResult.unit ? ` ${keyResult.unit}` : ""}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Preview</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatOkrProgressPercent(previewProgress)}
                </span>
              </div>
              <OkrProgressBar percent={previewProgress} size="sm" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Comentário <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="O que mudou?"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isInputValid || mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
