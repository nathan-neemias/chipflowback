-- Adicionar colunas para os tokens se não existirem
ALTER TABLE User
ADD COLUMN IF NOT EXISTS jusToken VARCHAR(255),
ADD COLUMN IF NOT EXISTS vbsenderToken VARCHAR(255); 