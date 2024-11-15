// validaciones/dbValidation.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const CREATE_TABLES_SQL = `
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE IF NOT EXISTS \`socket_io_canales\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`nombre\` varchar(255) NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  \`dias\` int(11) DEFAULT 90,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`socket_io_conexiones_rechazadas\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`canal_id\` int(11) DEFAULT NULL,
  \`ip\` varchar(45) NOT NULL,
  \`veces\` int(11) DEFAULT 1,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`),
  KEY \`idx_ip_canal\` (\`ip\`,\`canal_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`socket_io_eventos\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`id_canal\` int(11) DEFAULT NULL,
  \`evento\` varchar(255) NOT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  KEY \`id_canal\` (\`id_canal\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`socket_io_historial\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`id_canal\` int(11) DEFAULT NULL,
  \`id_evento\` int(11) DEFAULT NULL,
  \`ip\` varchar(45) NOT NULL,
  \`mensaje\` text DEFAULT NULL,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`),
  KEY \`id_canal\` (\`id_canal\`),
  KEY \`id_evento\` (\`id_evento\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`socket_io_ips_validas\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`id_canal\` int(11) DEFAULT NULL,
  \`ip\` varchar(45) NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`id_canal\` (\`id_canal\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS \`socket_io_tokens\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`id_canal\` int(11) DEFAULT NULL,
  \`token\` varchar(255) NOT NULL,
  \`permisos\` enum('receptor','emisor') NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`id_canal\` (\`id_canal\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE \`socket_io_eventos\`
  ADD CONSTRAINT \`socket_io_eventos_ibfk_1\` FOREIGN KEY (\`id_canal\`) REFERENCES \`socket_io_canales\` (\`id\`);

ALTER TABLE \`socket_io_historial\`
  ADD CONSTRAINT \`socket_io_historial_ibfk_1\` FOREIGN KEY (\`id_canal\`) REFERENCES \`socket_io_canales\` (\`id\`),
  ADD CONSTRAINT \`socket_io_historial_ibfk_2\` FOREIGN KEY (\`id_evento\`) REFERENCES \`socket_io_eventos\` (\`id\`);

ALTER TABLE \`socket_io_ips_validas\`
  ADD CONSTRAINT \`socket_io_ips_validas_ibfk_1\` FOREIGN KEY (\`id_canal\`) REFERENCES \`socket_io_canales\` (\`id\`);

ALTER TABLE \`socket_io_tokens\`
  ADD CONSTRAINT \`socket_io_tokens_ibfk_1\` FOREIGN KEY (\`id_canal\`) REFERENCES \`socket_io_canales\` (\`id\`);

COMMIT;
`;

const validateDatabase = async () => {
  try {
    // Verificar variables de entorno
    const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Faltan variables de entorno: ${missingEnvVars.join(', ')}`);
    }

    const config = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
      multipleStatements: true // Importante para ejecutar múltiples queries
    };

    // Crear conexión
    const connection = await mysql.createConnection(config);
    
    console.log(`Base de datos "${config.database}" encontrada en ${config.host}:${config.port}`);

    // Crear tablas
    try {
      await connection.query(CREATE_TABLES_SQL);
      console.log('Tablas creadas/verificadas exitosamente');
    } catch (error) {
      console.error('Error al crear las tablas:', error.message);
      throw error;
    }

    // Verificar la conexión con una consulta simple
    await connection.query('SELECT 1');
    
    // Cerrar la conexión
    await connection.end();
    
    return true;
  } catch (error) {
    console.error('Error en la validación de la base de datos:', error);
    throw error;
  }
};

module.exports = validateDatabase;