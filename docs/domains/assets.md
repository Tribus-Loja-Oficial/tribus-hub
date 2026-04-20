# Domain: Assets

## Propósito

Armazenamento e gestão de arquivos internos usados em páginas, projetos e tarefas.

## Armazenamento

Cloudflare R2 (S3-compatible). Abstração completa em `src/lib/integrations/r2/`.

## Entidades

- `assets` — metadados do arquivo (bucket, object_key, mime, tamanho, checksum)
- `asset_links` — associação entre asset e entidade (page, project, task, milestone)

## Object keys

Formato: `uploads/YYYY/[id].[ext]`

Gerado pela aplicação, não pelo cliente. O nome original é armazenado em `original_filename`.

## Usage kinds

- `cover` — imagem de capa de uma página ou projeto
- `inline` — imagem inserida no corpo do editor
- `attachment` — anexo listado
- `reference` — referência sem exibição direta
- `avatar` — avatar de usuário

## Acesso

- Se `R2_PUBLIC_URL` configurado: URL direta do CDN/bucket público
- Caso contrário: URL assinada que expira em 1 hora

## Tipos permitidos

Configurável via `UPLOAD_ALLOWED_MIME_TYPES`. Default: imagens, PDF, documentos Office, texto.

## Limite de tamanho

Configurável via `UPLOAD_MAX_SIZE_BYTES`. Default: 50MB.
