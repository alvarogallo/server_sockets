require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2');

const validateDatabase = () => {
  return new Promise((resolve, reject) => {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    connection.connect((err) => {
      if (err) {
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