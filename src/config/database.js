// src/config/database.js - Configuración de conexión a MongoDB
const mongoose = require('mongoose');

/**
 * Función para conectar a la base de datos MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Solo mostrar el host sin credenciales
    const host = conn.connection.host;
    console.log(`✅ MongoDB conectado: ${host}`);
    
    // Event listeners para monitorear el estado de la conexión
    mongoose.connection.on('connected', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Mongoose conectado a MongoDB');
      }
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌ Error de conexión MongoDB: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📴 Mongoose desconectado de MongoDB');
    });

    // Manejo de cierre graceful de la aplicación
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 Conexión MongoDB cerrada debido a terminación de la aplicación');
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ Error al conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;