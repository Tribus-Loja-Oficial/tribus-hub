# Page Editing Flow

## Criação de página

```
User → clica "Nova página" → modal com título
     → POST /api/knowledge/pages { title }
     → knowledge.service.createPage()
     → slugify(title) → checar colisão → uniqueSlug se necessário
     → pages.repository.createPage()
     → audit: page.created
     → redirect para /knowledge/:id
```

## Edição com autosave

```
User digita no editor (Tiptap)
→ onChange dispara
→ debounce 1500ms (appConfig.editor.autosaveDebounceMs)
→ PATCH /api/knowledge/pages/:id { contentJson }
→ knowledge.service.updatePage()
→ extractTextFromJson() → atualiza content_text
→ excerptFromText() → atualiza excerpt
→ pages.repository.updatePage()
→ UI: "Salvando..." → "Salvo"
```

## Criação de revisão

```
updatePage(input) com { createRevision: true }
→ getLatestRevisionVersion(pageId) → version + 1
→ pages.repository.createRevision()
→ snapshot completo do conteúdo armazenado
```

## Arquivamento

```
POST /api/knowledge/pages/:id/archive
→ knowledge.service.archivePage()
→ pages.repository.archivePage() → status: 'archived', archived_at: now
→ audit: page.archived
→ página não aparece na listagem padrão
```

## Restauração

```
POST /api/knowledge/pages/:id/restore
→ knowledge.service.restorePage()
→ pages.repository.restorePage() → status: 'published', archived_at: null
→ audit: page.restored
```
