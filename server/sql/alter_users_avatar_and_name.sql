-- Путь к аватарке: относительный URL от API (как в коде), например /uploads/user_12345678_123.png
-- VARCHAR достаточно; при длинных именах файлов можно увеличить до 1024.

USE giftproject;

ALTER TABLE users
  ADD COLUMN avatar VARCHAR(512) NULL AFTER description_user;

-- Если раньше на name был UNIQUE, снять ограничение (имя индекса в вашей БД может отличаться).
-- Проверьте: SHOW INDEX FROM users WHERE Column_name = 'name';
ALTER TABLE users DROP INDEX name;
