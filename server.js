// server.js - Versión con conexión real a MongoDB
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./src/config/database'); // ✅ Importar conexión DB
const { errorHandler } = require('./src/middleware/errorHandler'); // ✅ Importar error handler
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando SocialConnect API...');

// ✅ CONECTAR A MONGODB AL INICIO
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log('✅ Base de datos conectada exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  }
};

// Middleware de seguridad
app.use(helmet());

// Middleware para permitir CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

console.log('✅ Middleware configurado');

// Configuración de Swagger para documentación de la API
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SocialConnect API',
      version: '1.0.0',
      description: 'API backend para plataforma de redes sociales donde los usuarios pueden crear posts, seguir a otros usuarios, comentar y dar likes',
      contact: {
        name: 'SocialConnect Team',
        email: 'team@socialconnect.com'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    './src/routes/*.js',    // Rutas de la API
    './src/models/*.js',    // Modelos (aquí están los schemas)
    './server.js'           // Archivo principal
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

console.log('✅ Swagger configurado');

/**
 * @swagger
 * /:
 *   get:
 *     summary: Ruta de bienvenida
 *     responses:
 *       200:
 *         description: Mensaje de bienvenida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bienvenido a SocialConnect API"
 *                 documentation:
 *                   type: string
 *                   example: "/api-docs"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a SocialConnect API',
    documentation: '/api-docs',
    version: '1.0.0',
    status: 'funcionando ✅',
    endpoints: {
      users: '/api/users',
      posts: '/api/posts',
      docs: '/api-docs'
    }
  });
});

// Swagger UI - Debe ir antes de las rutas de la API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

console.log('✅ Swagger UI configurado en /api-docs');

// ✅ IMPORTAR RUTAS REALES (que usan los controladores)
try {
  console.log('🔍 Cargando rutas de usuarios...');
  const userRoutes = require('./src/routes/userRoutes'); // Cambiar a rutas reales
  app.use('/api/users', userRoutes);
  console.log('✅ Rutas de usuarios cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas de usuarios:', error.message);
}

try {
  console.log('🔍 Cargando rutas de posts...');
  const postRoutes = require('./src/routes/postRoutes'); // Cambiar a rutas reales
  app.use('/api/posts', postRoutes);
  console.log('✅ Rutas de posts cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas de posts:', error.message);
}

// Middleware para manejar rutas no encontradas (404)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`,
    availableEndpoints: {
      home: '/',
      documentation: '/api-docs',
      users: '/api/users',
      posts: '/api/posts'
    }
  });
});

// ✅ USAR EL ERROR HANDLER REAL
app.use(errorHandler);

// ✅ INICIAR SERVIDOR CON CONEXIÓN DB
const initializeApp = async () => {
  await startServer();
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📚 Documentación disponible en: http://localhost:${PORT}/api-docs`);
    console.log(`🌐 API disponible en: http://localhost:${PORT}`);
    console.log(`👥 Usuarios: http://localhost:${PORT}/api/users`);
    console.log(`📝 Posts: http://localhost:${PORT}/api/posts`);
    console.log('');
    console.log('✅ SocialConnect API lista para usar!');
  });
};

// Ejecutar la aplicación
initializeApp().catch(console.error);

module.exports = app;