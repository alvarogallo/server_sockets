const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const validarEnviador = require('../validaciones/validar_enviador');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Variable para determinar qué fuente de datos usar
let cual_usar = 'json_local';

// Definición de rutas de archivos
const listenersPath = path.join(__dirname, '../json_from_api_db/listeners.json');
const sendersPath = path.join(__dirname, '../json_from_api_db/senders.json');
const logPath = path.join(__dirname, '../public', 'server_logs.json');

let listeners = [];
let senders = [];
const activeChannels = new Map();

// Función mejorada para leer archivos JSON
function readJsonFile(filePath) {
  try {
    console.log(`Intentando leer archivo: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.error(`Archivo no encontrado: ${filePath}`);
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error leyendo archivo ${filePath}:`, error);
    return null;
  }
}

async function loadData() {
  console.log('Iniciando carga de datos...');
  console.log('Modo actual:', cual_usar);
  
  if (cual_usar === 'json_local') {
    listeners = readJsonFile(listenersPath) || [];
    senders = readJsonFile(sendersPath) || [];
    console.log('Listeners cargados:', listeners);
    console.log('Senders cargados:', senders);
  } else if (cual_usar === 'json_api') {
    try {
      const apiData = await fetchDataFromAPI();
      if (apiData) {
        listeners = apiData.listeners || [];
        senders = apiData.senders || [];
        console.log('Datos API cargados:', { listeners, senders });
      } else {
        console.log('Usando datos locales como respaldo...');
        listeners = readJsonFile(listenersPath) || [];
        senders = readJsonFile(sendersPath) || [];
      }
    } catch (error) {
      console.error('Error cargando datos de API:', error);
      listeners = readJsonFile(listenersPath) || [];
      senders = readJsonFile(sendersPath) || [];
    }
  }
  
  console.log('Carga de datos completada');
  console.log('Listeners finales:', listeners);
  console.log('Senders finales:', senders);
}

function validarListener(canal, token) {
  const listenerValido = listeners.find(
    (listener) => listener.canal === canal && listener.token === token
  );
  
  if (listenerValido) {
    return [null, 'Listener válido.'];
  } else {
    return ['listener_invalido', 'Canal o token no válidos para listener.'];
  }
}

function addLog(canal, evento, mensaje) {
  const now = new Date();
  const logEntry = {
    created_at: now.toISOString(),
    canal,
    evento,
    mensaje
  };

  let logs = [];
  try {
    if (fs.existsSync(logPath)) {
      const fileContent = fs.readFileSync(logPath, 'utf8');
      logs = JSON.parse(fileContent);
    } else {
      console.log('Archivo de log no encontrado. Creando uno nuevo.');
    }

    logs.push(logEntry);

    // Filtrar logs de las últimas 24 horas
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    logs = logs.filter(log => new Date(log.created_at) > oneDayAgo);

    // Limitar a 200 registros si es necesario
    if (logs.length > 200) {
      logs = logs.slice(-200);
    }

    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    console.log('Log agregado exitosamente.');
  } catch (error) {
    console.error('Error al manejar el archivo de log:', error);
  }
}

function addServerRebootLog() {
  addLog('system', 'server_reboot', 'Servidor Rebooted');
}

async function fetchDataFromAPI() {
  try {
    const response = await axios.get('https://apisbotman.unatecla.com/api/SK/json_sockets');
    return response.data;
  } catch (error) {
    console.error('Error fetching data from API:', error);
    return null;
  }
}

// Función para actualizar el conteo de canales activos
function updateActiveChannel(canal, socketId, isJoining = true) {
  if (isJoining) {
    if (!activeChannels.has(canal)) {
      activeChannels.set(canal, new Set());
    }
    activeChannels.get(canal).add(socketId);
  } else {
    if (activeChannels.has(canal)) {
      activeChannels.get(canal).delete(socketId);
      if (activeChannels.get(canal).size === 0) {
        activeChannels.delete(canal);
      }
    }
  }
}

// Función para obtener todos los canales únicos de los listeners
function getAllChannels() {
  try {
    if (!Array.isArray(listeners)) {
      console.error('Error: listeners no es un array:', listeners);
      return [];
    }
    const channelsSet = new Set();
    listeners.forEach(listener => {
      if (listener && listener.canal) {
        channelsSet.add(listener.canal);
      } else {
        console.warn('Listener inválido encontrado:', listener);
      }
    });
    return Array.from(channelsSet);
  } catch (error) {
    console.error('Error en getAllChannels:', error);
    return [];
  }
}

// Llamar a la función de log de reinicio al iniciar el servidor
addServerRebootLog();

// Cargar datos iniciales
loadData();

// Rutas de la aplicación
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/logs', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'logs.html'));
});

app.get('/api/logs', (req, res) => {
  if (fs.existsSync(logPath)) {
    const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    res.json(logs);
  } else {
    res.json([]);
  }
});

// Ruta para obtener canales activos
app.get('/api/active-channels', (req, res) => {
  try {
    console.log('Obteniendo canales activos...');
    console.log('Estado actual de listeners:', listeners);
    console.log('Estado actual de activeChannels:', activeChannels);

    const allChannels = getAllChannels();
    console.log('Canales obtenidos:', allChannels);

    const channelsInfo = {
      active: {},
      all: allChannels.reduce((acc, channel) => {
        try {
          const activeConnections = activeChannels.get(channel)?.size || 0;
          acc[channel] = {
            isActive: activeConnections > 0,
            connections: activeConnections
          };
        } catch (error) {
          console.error(`Error procesando canal ${channel}:`, error);
          acc[channel] = {
            isActive: false,
            connections: 0,
            error: 'Error procesando canal'
          };
        }
        return acc;
      }, {})
    };

    console.log('Respuesta final:', channelsInfo);
    res.json(channelsInfo);
  } catch (error) {
    console.error('Error en /api/active-channels:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Nueva ruta para ver el contenido de los archivos JSON
app.get('/api/json-content', (req, res) => {
  const listenersContent = readJsonFile(listenersPath);
  const sendersContent = readJsonFile(sendersPath);
  
  res.json({
    listeners: listenersContent,
    senders: sendersContent,
    paths: {
      listeners: listenersPath,
      senders: sendersPath
    }
  });
});

app.post('/set-data-source', (req, res) => {
  const { source } = req.body;
  if (source === 'json_local' || source === 'json_api') {
    cual_usar = source;
    loadData();
    res.json({ message: `Fuente de datos cambiada a ${source}` });
  } else {
    res.status(400).json({ error: 'Fuente de datos no válida' });
  }
});

app.post('/enviar-mensaje', (req, res) => {
  const { canal, token, evento, mensaje } = req.body;
  const ipCliente = req.ip;
  
  const [error, razon] = validarEnviador(canal, token, ipCliente);
  
  if (error) {
    return res.status(400).json({ error, mensaje: razon });
  }
  
  io.to(canal).emit(evento, mensaje);
  addLog(canal, evento, mensaje);
  res.json({ mensaje: 'Evento enviado correctamente' });
});

// Manejo de conexiones Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Mantener registro de los canales a los que está suscrito este socket
  const subscribedChannels = new Set();

  socket.on('enviarEvento', (data) => {
    const { canal, token, evento, mensaje } = data;
    const ipCliente = socket.handshake.address;
    
    const [error, razon] = validarEnviador(canal, token, ipCliente);
    
    if (error) {
      console.log('Error en la validación:', razon);
      socket.emit('respuesta', { mensaje: razon });
    } else {
      console.log('Evento enviado:', { canal, evento, mensaje });
      io.to(canal).emit(evento, mensaje);
      addLog(canal, evento, mensaje);
    }
  });

  socket.on('unirseCanal', (data) => {
    const { canal, token } = data;
    
    const [error, razon] = validarListener(canal, token);
    
    if (error) {
      socket.emit('respuesta', { mensaje: razon });
    } else {
      socket.join(canal);
      subscribedChannels.add(canal);
      updateActiveChannel(canal, socket.id, true);
      socket.emit('respuesta', { mensaje: `Te has unido al canal: ${canal}` });
      console.log(`Socket ${socket.id} se unió al canal ${canal}`);
      addLog(canal, 'unirseCanal', { socketId: socket.id });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
    // Limpiar canales activos cuando el socket se desconecta
    for (const canal of subscribedChannels) {
      updateActiveChannel(canal, socket.id, false);
    }
    subscribedChannels.clear();
    addLog('system', 'disconnect', { socketId: socket.id });
  });
});

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});