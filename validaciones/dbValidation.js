// validaciones/dbValidation.js
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
`;

const INSERT_INITIAL_DATA_SQL = `
SET FOREIGN_KEY_CHECKS=0;

-- Limpiar tablas existentes
TRUNCATE TABLE socket_io_ips_validas;
TRUNCATE TABLE socket_io_tokens;
TRUNCATE TABLE socket_io_eventos;
TRUNCATE TABLE socket_io_historial;
TRUNCATE TABLE socket_io_conexiones_rechazadas;
TRUNCATE TABLE socket_io_canales;

SET FOREIGN_KEY_CHECKS=1;

-- Insertamos los canales
INSERT INTO socket_io_canales (nombre, dias) VALUES
('bingo', 90),
('rifas', 90),
('ais_shipping', 90),
('Bingo_Automatico', 90);

-- Insertamos los eventos base para cada canal
INSERT INTO socket_io_eventos (id_canal, evento) 
SELECT c.id, e.evento
FROM socket_io_canales c
CROSS JOIN (
    SELECT 'new_order' as evento
    UNION ALL SELECT 'primero'
    UNION ALL SELECT '123'
) e;

-- Insertamos los tokens de los listeners (receptores)
INSERT INTO socket_io_tokens (id_canal, token, permisos)
SELECT c.id, l.token, 'receptor' as permisos
FROM (
  SELECT 'bingo' as canal, 'oidor_2' as token
  UNION ALL SELECT 'rifas', 'rifa_recibir'
  UNION ALL SELECT 'ais_shipping', 'yo_escucho_ais'
  UNION ALL SELECT 'Bingo_Automatico', 'bingo_automatico'
) l
JOIN socket_io_canales c ON c.nombre = l.canal;

-- Insertamos los tokens de los senders (emisores)
INSERT INTO socket_io_tokens (id_canal, token, permisos)
SELECT c.id, s.token, 'emisor' as permisos
FROM (
  SELECT 'bingo' as canal, 'token_enviador_123' as token
  UNION ALL SELECT 'rifas', 'Enviador_RV_001'
  UNION ALL SELECT 'ais_shipping', 'envidor'
  UNION ALL SELECT 'Bingo_Automatico', 'bingo_automatico'
) s
JOIN socket_io_canales c ON c.nombre = s.canal;

-- Insertamos las IPs válidas
INSERT INTO socket_io_ips_validas (id_canal, ip)
SELECT DISTINCT c.id, ip.direccion
FROM socket_io_canales c
CROSS JOIN (
    SELECT '0.0.0.0' as direccion
    UNION ALL SELECT '::1'
    UNION ALL SELECT '127.0.0.1'
    UNION ALL SELECT '::ffff:172.24.23.100'
    UNION ALL SELECT '172.24.23.100'
    UNION ALL SELECT '172.22.3.133'
) ip;
`;

const validateDatabase = async () => {
  console.log('Iniciando validación de base de datos...');
  
  const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 20000,
    multipleStatements: true
  };

  console.log('Configuración de conexión:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database
  });

  try {
    if (!dbConfig.host || !dbConfig.port || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
      throw new Error('Faltan variables de conexión necesarias');
    }

    console.log('Intentando conectar a la base de datos...');
    
    const connection = await mysql.createConnection(dbConfig);
    console.log('Conexión establecida exitosamente');

    // Crear tablas
    console.log('Iniciando creación de tablas...');
    await connection.query(CREATE_TABLES_SQL);
    console.log('Tablas creadas exitosamente');

    // Insertar datos iniciales
    console.log('Insertando datos iniciales...');
    await connection.query(INSERT_INITIAL_DATA_SQL);
    console.log('Datos iniciales insertados exitosamente');

    // Verificar datos insertados
    console.log('\n=== Verificando datos insertados ===');
    
    const [canales] = await connection.query('SELECT * FROM socket_io_canales');
    console.log('\nCanales insertados:', canales);

    const [eventos] = await connection.query('SELECT e.*, c.nombre as canal_nombre FROM socket_io_eventos e JOIN socket_io_canales c ON e.id_canal = c.id');
    console.log('\nEventos insertados:', eventos);

    const [tokens] = await connection.query(`
      SELECT t.*, c.nombre as canal_nombre 
      FROM socket_io_tokens t 
      JOIN socket_io_canales c ON t.id_canal = c.id
      ORDER BY c.nombre, t.permisos
    `);
    console.log('\nTokens insertados:', tokens);

    const [ips] = await connection.query(`
      SELECT i.*, c.nombre as canal_nombre 
      FROM socket_io_ips_validas i 
      JOIN socket_io_canales c ON i.id_canal = c.id
    `);
    console.log('\nIPs válidas insertadas:', ips);

    // Mostrar resumen
    console.log('\n=== Resumen de inserciones ===');
    console.log(`Canales insertados: ${canales.length}`);
    console.log(`Eventos insertados: ${eventos.length}`);
    console.log(`Tokens insertados: ${tokens.length}`);
    console.log(`IPs válidas insertadas: ${ips.length}`);

    await connection.end();
    console.log('\nConexión cerrada correctamente');
    
    return true;
  } catch (error) {
    console.error('Error detallado:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    throw error;
  }
};

module.exports = validateDatabase;