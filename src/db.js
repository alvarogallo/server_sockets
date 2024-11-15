const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: async (sql, params) => {
    const [results] = await pool.execute(sql, params);
    return results;
  }
};