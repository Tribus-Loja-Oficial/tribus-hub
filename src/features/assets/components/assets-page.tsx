"use client";

import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Upload, FileText, Image as ImageIcon, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageGuide, GuideSection, GuideList } from "@/components/ui/page-guide";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AssetWithUrl {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

export function AssetsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<{ data: AssetWithUrl[] }>({
    queryKey: ["assets"],
    queryFn: () => fetch("/api/assets").then((r) => r.json()),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/assets/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to upload");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assets"] }),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  const assets = data?.data ?? [];

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Assets</h1>
        </div>
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          <Upload className="h-4 w-4" />
          {uploadMutation.isPending ? "Enviando..." : "Upload"}
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      <PageGuide title="O que são Assets?">
        <p>
          Repositório central de arquivos internos da equipe — imagens, documentos, planilhas e
          outros arquivos de referência.
        </p>
        <GuideSection title="Nesta tela:">
          <GuideList
            items={[
              "faça upload de qualquer tipo de arquivo pelo botão 'Upload';",
              "arquivos ficam disponíveis para toda a equipe do workspace;",
              "clique no nome do arquivo para baixá-lo;",
              "use os assets para centralizar materiais usados em projetos e documentações.",
            ]}
          />
        </GuideSection>
      </PageGuide>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && assets.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <File className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">Nenhum arquivo enviado ainda.</p>
        </div>
      )}

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-accent/30"
          >
            <AssetIcon mimeType={asset.mimeType} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {asset.originalFilename}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(asset.sizeBytes)} ·{" "}
                {formatDistanceToNow(new Date(asset.createdAt), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-primary hover:underline"
            >
              Abrir
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
