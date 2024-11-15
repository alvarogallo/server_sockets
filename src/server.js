// validaciones/dbValidation.js
require('dotenv').config();
const mysql = require('mysql2');

const validateDatabase = () => {
  return new Promise((resolve, reject) => {
    // Verificar que todas las variables de entorno necesarias estén presentes
    const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      reject(`Faltan variables de entorno: ${missingEnvVars.join(', ')}`);
      return;
    }

    const config = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
      ssl: process.env.NODE_ENV === 'production' ? true : false
    };

    const connection = mysql.createConnection(config);

    connection.connect((err) => {
      if (err) {
        const safeConfig = {
          ...config,
          password: '********'
        };

        console.error('Error de conexión a la base de datos:', {
          error: err.message,
          code: err.code,
          config: safeConfig
        });

        reject(`Error de conexión: ${err.code} - ${err.message}`);
        return;
      }

      console.log(`Base de datos "${config.database}" encontrada en ${config.host}:${config.port}`);
      
      connection.query('SELECT 1', (queryErr) => {
        connection.end();
        
        if (queryErr) {
          reject(`Error al verificar la conexión: ${queryErr.message}`);
          return;
        }
        
        resolve(true);
      });
    });

    connection.on('error', (err) => {
      console.error('Error en la conexión:', err);
      reject(`Error en la conexión: ${err.message}`);
    });
  });
};

module.exports = validateDatabase;