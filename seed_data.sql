-- =============================================================================
-- DATOS SEMILLA PARA PRUEBAS ACADÉMICAS (SEED DATA)
-- Sistema Farmacéutico Inkafarma (Microservicios)
-- =============================================================================

-- 1. POBLAR MICROSERVICIO DE CATÁLOGO (db_catalogo_inka)
USE `db_catalogo_inka`;

-- Insertar Categorías farmacéuticas
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Medicamentos y Alivio del Dolor', 'Analgésicos, antibióticos, antipiréticos y antiinflamatorios.'),
(2, 'Cuidado Personal y Dermocosmética', 'Higiene bucal, jabones neutros y protectores solares.'),
(3, 'Vitaminas y Suplementos', 'Multivitamínicos, zinc, colágeno y vitamina C.')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Insertar Productos farmacéuticos con precios y stock inicial
INSERT INTO `products` (`id`, `name`, `description`, `price`, `stock`, `category_id`) VALUES
(1, 'Paracetamol 500mg - Caja 20 Tabletas', 'Analgésico y antipirético para el alivio del dolor y la fiebre.', 8.50, 50, 1),
(2, 'Ibuprofeno 400mg - Blíster 10 Cápsulas', 'Antiinflamatorio no esteroideo para dolores musculares.', 6.20, 30, 1),
(3, 'Amoxicilina 500mg - Caja 15 Cápsulas', 'Antibiótico betalactámico para infecciones respiratorias.', 18.00, 20, 1),
(4, 'Protector Solar FPS 50+ 200ml', 'Protección solar de amplio espectro UVA/UVB.', 64.90, 15, 2),
(5, 'Vitamina C + Zinc 1000mg - Tubo 10 Tabletas Efervescentes', 'Refuerzo del sistema inmunológico.', 19.90, 40, 3)
ON DUPLICATE KEY UPDATE `stock`=VALUES(`stock`);


-- 2. POBLAR MICROSERVICIO DE USUARIOS (db_usuarios_inka)
USE `db_usuarios_inka`;

-- Insertar Usuario de prueba (Contraseña plana: 'farmacia123')
-- Hash bcrypt generado para 'farmacia123': $2b$12$eZkW1.E.31GhyvK3.v90OOGZkSsm1m.c.2pYQ1p5w2qXv36vE0wSm (referencial)
INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `address`, `phone`) VALUES
(1, 'Juan Perez Gomez', 'juan.perez@universidad.edu.pe', '$2b$12$KkQjP6yQzH2Q0VlF9x3j3O7tP4g5h7j8k9l0m1n2o3p4q5r6s7t8u', 'Av. Javier Prado Este 2465, Lima, Perú', '+51 987654321')
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);
