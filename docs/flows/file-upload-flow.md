# File Upload Flow

## Upload de asset

```
User seleciona arquivo (input[type=file])
→ FormData com campo "file"
→ POST /api/assets/upload (multipart/form-data)
→ requireAuth()
→ asset.service.uploadAsset()
  ├─ validar mime type vs UPLOAD_ALLOWED_MIME_TYPES
  ├─ validar tamanho vs UPLOAD_MAX_SIZE_BYTES
  ├─ r2.service.uploadToR2(buffer, filename, mimeType)
  │   ├─ gera object_key: uploads/YYYY/[id].[ext]
  │   ├─ calcula checksum SHA256
  │   └─ PutObjectCommand → R2
  ├─ extrair dimensões se image/* (image-size)
  ├─ assets.repository.createAsset() → persiste metadados no DB
  └─ audit: asset.uploaded
→ Retorna asset com URL (pública ou signed)
→ UI: exibe asset na listagem
```

## Acesso ao asset

```
GET /api/assets/:id
→ assets.repository.findAssetById()
→ r2.service.getPublicUrl() — se R2_PUBLIC_URL configurado
→ r2.service.getSignedDownloadUrl() — fallback, expira em 1h
→ Retorna asset + url
```

## Deleção de asset

```
DELETE /api/assets/:id
→ asset.service.deleteAsset()
→ r2.service.deleteFromR2(objectKey) — remove do R2
→ assets.repository.deleteAssetLinks(id) — remove associações
→ assets.repository.deleteAsset(id) — remove metadados
→ audit: asset.deleted
```

## Associação com entidades

```
POST /api/assets/:id/link { entityType, entityId, usageKind }
→ asset.service.linkAsset()
→ Verifica que asset pertence ao workspace
→ assets.repository.createAssetLink()
```

## Segurança

- Mime type validado server-side, não confiando no header do cliente
- Object key gerado pela aplicação (não usa nome original)
- Limite de tamanho configurável por env
- Assets privados nunca expostos diretamente pelo bucket
