"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OkrKeyResult } from "@/lib/db/schema";
import { OkrProgressBar } from "./okr-progress-bar";

interface UpdateKeyResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResult: OkrKeyResult | null;
}

export function UpdateKeyResultDialog({
  open,
  onOpenChange,
  keyResult,
}: UpdateKeyResultDialogProps) {
  const queryClient = useQueryClient();
  const [newValue, setNewValue] = useState("");
  const [comment, setComment] = useState("");

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
      queryClient.invalidateQueries({ queryKey: ["okr-key-results"] });
      queryClient.invalidateQueries({ queryKey: ["okr-objectives"] });
      queryClient.invalidateQueries({ queryKey: ["okr-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["okr-kr-updates", keyResult?.id] });
      handleClose();
    },
  });

  function handleClose() {
    onOpenChange(false);
    setNewValue("");
    setComment("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newValue === "" || !keyResult) return;
    mutation.mutate({ newValue: parseFloat(newValue), comment: comment.trim() || undefined });
  }

  if (!keyResult) return null;

  const isBoolean = keyResult.metricType === "boolean";
  const previewProgress = newValue !== ""
    ? (() => {
        const sv = keyResult.startValue;
        const tv = keyResult.targetValue;
        const cv = parseFloat(newValue);
        if (isBoolean) return cv >= 1 ? 100 : 0;
        const range = tv - sv;
        if (range === 0) return cv >= tv ? 100 : 0;
        return Math.min(100, Math.max(0, ((cv - sv) / range) * 100));
      })()
    : keyResult.progressPercent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Atualizar progresso</DialogTitle>
        </DialogHeader>

        <div className="py-1 space-y-3">
          <p className="text-sm font-medium text-foreground truncate">{keyResult.title}</p>

          <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso atual</span>
              <span className="font-semibold tabular-nums text-foreground">
                {Math.round(keyResult.progressPercent)}%
              </span>
            </div>
            <OkrProgressBar percent={keyResult.progressPercent} status={keyResult.status} size="sm" />
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{keyResult.currentValue}{keyResult.unit ? ` ${keyResult.unit}` : ""}</span>
              <span>meta: {keyResult.targetValue}{keyResult.unit ? ` ${keyResult.unit}` : ""}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isBoolean ? (
            <div className="space-y-1.5">
              <Label>Novo valor</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
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
                Novo valor{keyResult.unit ? ` (${keyResult.unit})` : ""} <span className="text-destructive">*</span>
              </Label>
              <Input
                autoFocus
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={String(keyResult.currentValue)}
              />
            </div>
          )}

          {newValue !== "" && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Preview</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {Math.round(previewProgress)}%
                </span>
              </div>
              <OkrProgressBar percent={previewProgress} size="sm" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Comentário <span className="text-muted-foreground text-xs">(opcional)</span></Label>
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
            <Button type="submit" disabled={newValue === "" || mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
