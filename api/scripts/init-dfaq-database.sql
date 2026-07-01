-- Ejecutar UNA VEZ en bignotti_mariadb (Adminer o consola root).
-- Crea base y usuario DFAQ separados de planificador.

CREATE DATABASE IF NOT EXISTS dfaq
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'dfaq_app'@'%' IDENTIFIED BY 'CAMBIAR_PASSWORD_AQUI';
GRANT ALL PRIVILEGES ON dfaq.* TO 'dfaq_app'@'%';
FLUSH PRIVILEGES;
