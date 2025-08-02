// src/config/database.js - Configuración de conexión a MongoDB
const mongoose = require('mongoose');

/**
 * Función para conectar a la base de datos MongoDB
 * Esta función establece la conexión con MongoDB usando Mongoose
 * y maneja errores de conexión
 */
const connectDB = async () => {
  try {
    // Obtener la URI de conexión desde las variables de entorno
    // MONGODB_URI debe estar definida en el archivo .env
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Estas opciones aseguran una conexión estable y moderna
      useNewUrlParser: true,      // Usa el nuevo parser de URL de MongoDB
      useUnifiedTopology: true,   // Usa el nuevo motor de monitoreo y descubrimiento de servidores
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    
    // Event listeners para monitorear el estado de la conexión
    
    // Se ejecuta cuando la conexión se establece correctamente
    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose conectado a MongoDB');
    });

    // Se ejecuta cuando hay un error en la conexión
    mongoose.connection.on('error', (err) => {
      console.error(`❌ Error de conexión MongoDB: ${err}`);
    });

    // Se ejecuta cuando la conexión se desconecta
    mongoose.connection.on('disconnected', () => {
      console.log('📴 Mongoose desconectado de MongoDB');
    });

    // Manejo de cierre graceful de la aplicación
    // Cuando la aplicación se cierra (Ctrl+C), cierra la conexión a MongoDB
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 Conexión MongoDB cerrada debido a terminación de la aplicación');
      process.exit(0);
    });

  } catch (error) {
    // Si hay error al conectar, lo mostramos y terminamos el proceso
    console.error(`❌ Error al conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;