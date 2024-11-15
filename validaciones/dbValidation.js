// validaciones/dbValidation.js
require('dotenv').config();
const mysql = require('mysql2');

const validateDatabase = () => {
  return new Promise((resolve, reject) => {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,      // Agregado el puerto específico de Railway
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    connection.connect((err) => {
      if (err) {
        console.error('Detalles de conexión:', {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          user: process.env.DB_USER,
          database: process.env.DB_NAME
        });
        reject('Error conectando a la base de datos: ' + err.message);
        return;
      }
      console.log('Base de datos encontrada');
      connection.end();
      resolve(true);
    });
  });
};

module.exports = validateDatabase;