-- =============================================================================
-- DATOS SEMILLA PARA PRUEBAS ACADÉMICAS (SEED DATA)
-- Sistema Farmacéutico Inkafarma (Microservicios e Inventario por Sede)
-- =============================================================================

-- 1. POBLAR MICROSERVICIO DE CATÁLOGO Y SEDES (db_catalogo_inka)
USE `db_catalogo_inka`;

-- Insertar Categorías farmacéuticas
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Medicamentos y Alivio del Dolor', 'Analgésicos, antibióticos, antipiréticos y antiinflamatorios.'),
(2, 'Cuidado Personal y Dermocosmética', 'Higiene bucal, botiquín básico y protectores solares.'),
(3, 'Vitaminas y Suplementos', 'Multivitamínicos, zinc, colágeno y vitamina C.')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Insertar Boticas / Sedes habilitadas
INSERT INTO `branches` (`id`, `code`, `name`, `address`, `district`, `is_active`) VALUES
(1, 'INKA-MIR', 'Inkafarma Miraflores (Av. Larco 450)', 'Av. Larco 450', 'Miraflores', 1),
(2, 'INKA-SIS', 'Inkafarma San Isidro (Av. Javier Prado 1200)', 'Av. Javier Prado 1200', 'San Isidro', 1),
(3, 'INKA-LIM', 'Inkafarma Lima Centro (Jr. de la Unión 600)', 'Jr. de la Unión 600', 'Lima Centro', 1)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `address`=VALUES(`address`), `district`=VALUES(`district`);

-- Insertar Catálogo Maestro de Productos (el stock aquí es el consolidado global)
INSERT INTO `products` (`id`, `name`, `description`, `price`, `stock`, `branch`, `category_id`) VALUES
(1, 'Paracetamol 500mg - Caja 20 Tabletas', 'Analgésico y antipirético para el alivio del dolor y la fiebre.', 8.50, 153, 'Stock distribuido por sede', 1),
(2, 'Ibuprofeno 400mg - Blíster 10 Cápsulas', 'Antiinflamatorio no esteroideo para dolores musculares.', 6.20, 34, 'Stock distribuido por sede', 1),
(3, 'Amoxicilina 500mg - Caja 15 Cápsulas', 'Antibiótico betalactámico para infecciones respiratorias.', 18.00, 23, 'Stock distribuido por sede', 1),
(4, 'Protector Solar FPS 50+ 200ml', 'Protección solar de amplio espectro UVA/UVB.', 64.90, 43, 'Stock distribuido por sede', 2),
(5, 'Vitamina C + Zinc 1000mg - Tubo 10 Tabletas Efervescentes', 'Refuerzo del sistema inmunológico.', 19.90, 78, 'Stock distribuido por sede', 3),
(6, 'Alcohol Medicinal 70° - Frasco 250ml', 'Antiséptico tópico de uso externo para botiquín familiar.', 7.90, 60, 'Stock distribuido por sede', 2),
(7, 'Loratadina 10mg - Caja 10 Tabletas', 'Antihistamínico para el alivio de síntomas de rinitis y alergias.', 9.50, 33, 'Stock distribuido por sede', 1),
(8, 'Colágeno Hidrolizado + Magnesio - Frasco 300g', 'Suplemento nutricional para articulaciones y bienestar óseo.', 54.90, 12, 'Stock distribuido por sede', 3)
ON DUPLICATE KEY UPDATE `stock`=VALUES(`stock`), `branch`=VALUES(`branch`);

-- Insertar Inventario Independiente por Botica (surtido y stock distinto en cada sede)
-- Miraflores (1): #1,#2,#3,#4,#5,#8 (no tiene #6 ni #7)
-- San Isidro (2): #1,#2(4un),#4,#5,#6,#7 (no tiene #3 ni #8)
-- Lima Centro (3): #1,#2(0 agotado),#3(3un),#5,#6,#7 (no tiene #4 ni #8)
INSERT INTO `branch_inventory` (`branch_id`, `product_id`, `stock`, `is_available`) VALUES
(1, 1, 50, 1),
(1, 2, 30, 1),
(1, 3, 20, 1),
(1, 4, 15, 1),
(1, 5, 40, 1),
(1, 8, 12, 1),
(2, 1, 18, 1),
(2, 2, 4, 1),
(2, 4, 28, 1),
(2, 5, 22, 1),
(2, 6, 35, 1),
(2, 7, 14, 1),
(3, 1, 85, 1),
(3, 2, 0, 1),
(3, 3, 3, 1),
(3, 5, 16, 1),
(3, 6, 25, 1),
(3, 7, 19, 1)
ON DUPLICATE KEY UPDATE `stock`=VALUES(`stock`), `is_available`=VALUES(`is_available`);


-- 2. POBLAR MICROSERVICIO DE USUARIOS (db_usuarios_inka)
USE `db_usuarios_inka`;

-- Insertar Usuario de prueba (hash referencial; para pruebas rápidas use la pestaña "Registrarme")
INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `address`, `phone`) VALUES
(1, 'Juan Perez Gomez', 'juan.perez@universidad.edu.pe', '$2b$12$KkQjP6yQzH2Q0VlF9x3j3O7tP4g5h7j8k9l0m1n2o3p4q5r6s7t8u', 'Av. Javier Prado Este 2465, Lima, Perú', '+51 987654321')
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);
