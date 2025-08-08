// server.js - SocialConnect API - Versión de Producción
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./src/config/database');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando SocialConnect API...');

/**
 * Función para inicializar la conexión a la base de datos
 */
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Base de datos conectada exitosamente');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  }
};

/**
 * Middleware de seguridad
 */
app.use(helmet());

/**
 * Configuración de CORS
 */
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.RENDER_EXTERNAL_URL,
        process.env.FRONTEND_URL,
        /\.onrender\.com$/
      ]
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Configuración de sesiones para OAuth
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_change_in_production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

/**
 * Inicialización de Passport para OAuth
 */
try {
  const { passport } = require('./src/middleware/oauth');
  app.use(passport.initialize());
  app.use(passport.session());
} catch (error) {
  console.error('❌ Error inicializando Passport OAuth:', error.message);
}

/**
 * Middleware para parsear peticiones JSON
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Configuración de Swagger para documentación de API
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SocialConnect API',
      version: '1.0.0',
      description: 'API backend para plataforma de redes sociales con OAuth, JWT y operaciones CRUD completas',
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

/**
 * @swagger
 * /:
 *   get:
 *     summary: Ruta de bienvenida con información de la API
 *     responses:
 *       200:
 *         description: Información de bienvenida y endpoints disponibles
 */
app.get('/', (req, res) => {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const githubConfigured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  
  res.json({
    message: 'Bienvenido a SocialConnect API',
    documentation: `${baseUrl}/api-docs`,
    version: '1.0.0',
    status: 'funcionando ✅',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'CRUD completo para Users y Posts',
      'Autenticación JWT',
      googleConfigured ? 'OAuth con Google ✅' : 'OAuth con Google ❌',
      githubConfigured ? 'OAuth con GitHub ✅' : 'OAuth con GitHub ❌',
      'Validación de datos',
      'Tests unitarios',
      'Documentación Swagger'
    ],
    endpoints: {
      users: `${baseUrl}/api/users`,
      posts: `${baseUrl}/api/posts`,
      auth: `${baseUrl}/api/auth`,
      docs: `${baseUrl}/api-docs`
    }
  });
});

/**
 * Configuración de Swagger UI
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * Importar y configurar rutas de autenticación OAuth
 */
try {
  const authRoutes = require('./src/routes/authRoutes');
  app.use('/api/auth', authRoutes);
} catch (error) {
  console.error('❌ Error cargando rutas de autenticación:', error.message);
}

/**
 * Importar y configurar rutas de usuarios
 */
try {
  const userRoutes = require('./src/routes/userRoutes_orig');
  app.use('/api/users', userRoutes);
} catch (error) {
  console.error('❌ Error cargando rutas de usuarios:', error.message);
}

/**
 * Importar y configurar rutas de posts
 */
try {
  const postRoutes = require('./src/routes/postRoutes_orig');
  app.use('/api/posts', postRoutes);
} catch (error) {
  console.error('❌ Error cargando rutas de posts:', error.message);
}

/**
 * Middleware para manejar rutas no encontradas (404)
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`,
    availableEndpoints: {
      home: '/',
      documentation: '/api-docs',
      users: '/api/users',
      posts: '/api/posts',
      auth: {
        google: '/api/auth/google',
        github: '/api/auth/github',
        status: '/api/auth/status'
      }
    }
  });
});

/**
 * Middleware global de manejo de errores
 */
app.use(errorHandler);

/**
 * Función para inicializar la aplicación completa
 */
const initializeApp = async () => {
  await startServer();
  
  const server = app.listen(PORT, () => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌐 API disponible en: ${baseUrl}`);
    console.log(`📚 Documentación: ${baseUrl}/api-docs`);
    console.log('✅ SocialConnect API lista para usar!');
  });

  // Manejar errores del servidor
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Puerto ${PORT} está ocupado`);
      process.exit(1);
    } else {
      console.error('❌ Error del servidor:', error);
    }
  });
};

// Ejecutar la aplicación
initializeApp().catch(console.error);

module.exports = app;