const validateDatabase = require('../validaciones/dbValidation');

const initServer = async () => {
  try {
    await validateDatabase();
    // Aquí puedes continuar con la configuración de tu servidor
    console.log('Servidor iniciado correctamente');
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

initServer();