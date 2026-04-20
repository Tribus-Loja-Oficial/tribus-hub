# Domain: Knowledge

## Propósito

Base de conhecimento institucional da Tribus. Armazena wiki, documentação, processos, decisões estratégicas e qualquer conteúdo textual estruturado.

## Entidades principais

- `pages` — documento principal
- `page_revisions` — histórico de versões
- `page_tags` / `page_tag_links` — categorização
- `relation_links` — relações entre páginas e outros objetos

## Estrutura hierárquica

Pages têm `parent_page_id`. A árvore é construída em memória pelo `knowledge.service.getPageTree()`.

## Editor

Tiptap com extensions:
- StarterKit (paragraph, headings, lists, code, blockquote, etc.)
- Underline, Link, Image, Table, TaskList, Highlight, Placeholder

Conteúdo armazenado como JSON canônico em `content_json`. Texto plano derivado em `content_text`.

## Autosave

Debounce de 1500ms (configurável em `appConfig.editor.autosaveDebounceMs`). Status visual: Saving → Saved / Error.

## Status de página

- `draft` — rascunho, não publicado
- `published` — publicado e visível
- `archived` — arquivado, não aparece na listagem padrão mas não foi excluído

## Revisões

Criadas em eventos relevantes ou manualmente (via `createRevision: true` no payload de PATCH). Armazenam snapshot completo do conteúdo.
