-- Remove password_hash from users. Authentication is delegated to tribus-cds.
ALTER TABLE users DROP COLUMN password_hash;
