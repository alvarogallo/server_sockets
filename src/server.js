// src/server.js
const validateDatabase = require('../validaciones/dbValidation');

console.log('Iniciando servidor...');

const initServer = async () => {
  try {
    console.log('Verificando conexión a la base de datos...');
    await validateDatabase();
    console.log('Validación de base de datos exitosa');
    
    // Aquí tu código del servidor...
    console.log('Servidor iniciado correctamente en el puerto:', process.env.PORT || 3000);
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    // En lugar de terminar el proceso, podríamos intentar reconectar
    setTimeout(() => {
      console.log('Intentando reiniciar el servidor...');
      initServer();
    }, 5000); // Reintenta cada 5 segundos
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('Error no manejado:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada:', error);
});

initServer();