-- Remove file-asset storage (R2 metadata tables). Page cover_image_asset_id remains as TEXT but is cleared.
UPDATE pages SET cover_image_asset_id = NULL WHERE cover_image_asset_id IS NOT NULL;

DROP TABLE IF EXISTS asset_links;
DROP TABLE IF EXISTS assets;
