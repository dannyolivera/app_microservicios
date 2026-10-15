-- =============================================================================
-- SCRIPT DE INICIALIZACIÓN DE BASES DE DATOS (ARQUITECTURA DATABASE-PER-SERVICE)
-- Sistema de E-Commerce Farmacéutico (Inkafarma Simulator)
-- =============================================================================
-- Cada microservicio posee su propio esquema de base de datos aislado.
-- Ejecute este script en su gestor de MySQL (MySQL Workbench, phpMyAdmin, CLI o DBeaver)
-- antes de ejecutar las migraciones de Alembic.

-- 1. Base de datos para el Microservicio de Catálogo (Puerto 8001)
CREATE DATABASE IF NOT EXISTS `db_catalogo_inka` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 2. Base de datos para el Microservicio de Usuarios y Autenticación (Puerto 8002)
CREATE DATABASE IF NOT EXISTS `db_usuarios_inka` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 3. Base de datos para el Microservicio de Pedidos / Órdenes (Puerto 8003)
CREATE DATABASE IF NOT EXISTS `db_pedidos_inka` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Verificación de bases de datos creadas
SHOW DATABASES LIKE '%inka%';
