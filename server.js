// server.js - Versión lista para producción en Render
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./src/config/database');
const { errorHandler } = require('./src/middleware/errorHandler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando SocialConnect API...');

// ✅ CONECTAR A MONGODB AL INICIO
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Base de datos conectada exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  }
};

// Middleware de seguridad
app.use(helmet());

// ✅ CORS CONFIGURADO PARA PRODUCCIÓN
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.RENDER_EXTERNAL_URL,
        process.env.FRONTEND_URL,
        /\.onrender\.com$/  // Permitir todos los subdominios de Render
      ]
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

console.log('✅ Middleware configurado');

// ✅ SWAGGER CONFIGURADO PARA PRODUCCIÓN
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
        url: process.env.RENDER_EXTERNAL_URL || process.env.API_URL || 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Servidor de producción' : 'Servidor de desarrollo'
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
    './src/routes/*.js',
    './src/models/*.js',
    './server.js'
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
// ✅ RUTA RAÍZ CON URLs DINÁMICAS
app.get('/', (req, res) => {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  
  res.json({
    message: 'Bienvenido a SocialConnect API',
    documentation: `${baseUrl}/api-docs`,
    version: '1.0.0',
    status: 'funcionando ✅',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      users: `${baseUrl}/api/users`,
      posts: `${baseUrl}/api/posts`,
      docs: `${baseUrl}/api-docs`
    }
  });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

console.log('✅ Swagger UI configurado en /api-docs');

// ✅ IMPORTAR RUTAS (usando nombres correctos)
try {
  console.log('🔍 Cargando rutas de usuarios...');
  const userRoutes = require('./src/routes/userRoutes');
  app.use('/api/users', userRoutes);
  console.log('✅ Rutas de usuarios cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas de usuarios:', error.message);
}

try {
  console.log('🔍 Cargando rutas de posts...');
  const postRoutes = require('./src/routes/postRoutes');
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

// ✅ USAR EL ERROR HANDLER
app.use(errorHandler);

// ✅ INICIAR SERVIDOR CON LOGS DINÁMICOS
const initializeApp = async () => {
  await startServer();
  
  app.listen(PORT, () => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📚 Documentación disponible en: ${baseUrl}/api-docs`);
    console.log(`🌐 API disponible en: ${baseUrl}`);
    console.log(`👥 Usuarios: ${baseUrl}/api/users`);
    console.log(`📝 Posts: ${baseUrl}/api/posts`);
    console.log('');
    console.log('✅ SocialConnect API lista para usar!');
  });
};

// Ejecutar la aplicación
initializeApp().catch(console.error);

module.exports = app;