-- Script de creación de base de datos para el sistema de citas de BotValeria
-- Creado a partir del análisis de los archivos de código fuente

-- Crear la base de datos si no existe
-- CREATE DATABASE IF NOT EXISTS novaly_bot_valeria;
-- USE novaly_bot_valeria;

-- Tabla de asesores
CREATE TABLE IF NOT EXISTS tbl_asesores (
    asesor_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_asesor VARCHAR(100) NOT NULL,
    correo_asesor VARCHAR(100) NOT NULL,
    telefono_asesor VARCHAR(20) NOT NULL,
    horario_atencion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS tbl_clientes (
    cliente_id INT AUTO_INCREMENT PRIMARY KEY, 
    nombre_cliente VARCHAR(100) NOT NULL,
    correo_cliente VARCHAR(100),
    nombre_empresa VARCHAR(100),
    telefono_cliente VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de tipos de reunión
CREATE TABLE IF NOT EXISTS tbl_tiporeunion (
    tiporeunion_id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de citas
CREATE TABLE IF NOT EXISTS tbl_citas (
    cita_id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    asesor_id INT,
    tiporeunion_id INT NOT NULL,
    fecha_reunion DATE NOT NULL,
    hora_reunion TIME NOT NULL,
    direccion VARCHAR(255),
    vinculo_reunion VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES tbl_clientes(cliente_id) ON DELETE CASCADE,
    FOREIGN KEY (asesor_id) REFERENCES tbl_asesores(asesor_id) ON DELETE SET NULL,
    FOREIGN KEY (tiporeunion_id) REFERENCES tbl_tiporeunion(tiporeunion_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos iniciales para tipos de reunión
INSERT INTO tbl_tiporeunion (tiporeunion_id, nombre, descripcion) VALUES
(1, 'Virtual', 'Reunión por videollamada'),
(2, 'Presencial', 'Reunión en persona en oficinas o lugar acordado')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion);

-- Datos iniciales para asesores (ejemplo)
INSERT INTO tbl_asesores (asesor_id, nombre_asesor, correo_asesor, telefono_asesor, horario_atencion) VALUES
(1, 'Asesor Principal', 'asesor@novaly.com', '999999999', 'Lunes a Viernes 9:00 - 18:00')
INSERT INTO `tbl_asesores` (`asesor_id`, `nombre_asesor`, `correo_asesor`, `telefono_asesor`, `horario_atencion`, `created_at`, `updated_at`) VALUES (NULL, 'CEO', 'aarevalo@novaly.com.pe', '51942400419', NULL, current_timestamp(), current_timestamp());
ON DUPLICATE KEY UPDATE 
    nombre_asesor = VALUES(nombre_asesor), 
    correo_asesor = VALUES(correo_asesor), 
    telefono_asesor = VALUES(telefono_asesor), 
    horario_atencion = VALUES(horario_atencion);