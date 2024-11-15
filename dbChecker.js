// conexiones/railwayDbChecker.js

const dns = require('dns');
const { promisify } = require('util');

const resolveDns = promisify(dns.resolve4);

async function checkRailwayDatabase() {
  const dbHost = process.env.RAILWAY_DB_HOST || process.env.DATABASE_URL;

  if (!dbHost) {
    return { success: false, message: 'No se ha configurado la variable de entorno RAILWAY_DB_HOST o DATABASE_URL' };
  }

  try {
    const hostname = new URL(dbHost).hostname;
    await resolveDns(hostname);
    return { success: true, message: `Base de datos en Railway detectada: ${hostname}` };
  } catch (error) {
    return { success: false, message: `No se pudo detectar la base de datos en Railway: ${error.message}` };
  }
}

module.exports = checkRailwayDatabase;