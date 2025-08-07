// server.js - Versión completa con OAuth y autenticación
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./src/config/database');
const { errorHandler } = require('./src/middleware/errorHandler');
const { passport } = require('./src/middleware/oauth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Iniciando SocialConnect API...');

/**
 * Función para inicializar la conexión a la base de datos
 * Se conecta a MongoDB al inicio de la aplicación
 * Si falla la conexión, termina el proceso
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
 * helmet() configura automáticamente varios headers HTTP de seguridad
 * como X-Frame-Options, X-XSS-Protection, etc.
 */
app.use(helmet());

/**
 * Configuración de CORS (Cross-Origin Resource Sharing)
 * Permite que el frontend (en otro dominio) haga peticiones a esta API
 */
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.RENDER_EXTERNAL_URL,
        process.env.FRONTEND_URL,
        /\.onrender\.com$/  // Permitir todos los subdominios de Render
      ]
    : '*', // En desarrollo, permitir cualquier origen
  credentials: true, // Permitir cookies y headers de autenticación
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Configuración de sesiones para OAuth
 * Las sesiones son necesarias para el flujo OAuth con Passport
 * Almacena datos temporales durante el proceso de autenticación
 */
app.use(session({
  // Clave secreta para firmar las cookies de sesión
  secret: process.env.SESSION_SECRET || 'your_session_secret_change_in_production',
  
  // No guardar sesiones no modificadas
  resave: false,
  
  // No crear sesiones para usuarios no autenticados
  saveUninitialized: false,
  
  // Almacenar sesiones en MongoDB
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    touchAfter: 24 * 3600 // Actualizar sesión cada 24 horas
  }),
  
  // Configuración de cookies
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS en producción
    httpOnly: true, // No accesible desde JavaScript del cliente
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

/**
 * Inicialización de Passport para OAuth
 * Passport maneja la autenticación con proveedores externos
 */
app.use(passport.initialize()); // Inicializar Passport
app.use(passport.session());    // Habilitar sesiones persistentes con Passport

/**
 * Middleware para parsear peticiones JSON
 * express.json() analiza el cuerpo de las peticiones con Content-Type: application/json
 * limit: '10mb' permite cargar archivos o datos de hasta 10MB
 */
app.use(express.json({ limit: '10mb' }));

/**
 * Middleware para parsear datos de formularios URL-encoded
 * Necesario para procesar formularios HTML tradicionales
 */
app.use(express.urlencoded({ extended: true }));

console.log('✅ Middleware configurado');

/**
 * Configuración de Swagger para documentación de API
 * Swagger genera documentación interactiva automáticamente
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
console.log('✅ Swagger configurado');

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
  
  res.json({
    message: 'Bienvenido a SocialConnect API',
    documentation: `${baseUrl}/api-docs`,
    version: '1.0.0',
    status: 'funcionando ✅',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'CRUD completo para Users y Posts',
      'Autenticación JWT',
      'OAuth con Google y GitHub',  
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
 * Proporciona interfaz web interactiva para probar la API
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log('✅ Swagger UI configurado en /api-docs');

/**
 * Importar y configurar rutas de autenticación OAuth
 * Estas rutas manejan login con Google y GitHub
 */
try {
  console.log('🔍 Cargando rutas de autenticación OAuth...');
  const authRoutes = require('./src/routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✅ Rutas de autenticación OAuth cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas de autenticación:', error.message);
}

/**
 * Importar y configurar rutas de usuarios
 * Incluye operaciones CRUD completas con autenticación
 */
try {
  console.log('🔍 Cargando rutas de usuarios...');
  const userRoutes = require('./src/routes/userRoutes_orig'); // Usar versión completa
  app.use('/api/users', userRoutes);
  console.log('✅ Rutas de usuarios cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas de usuarios:', error.message);
}

/**
 * Importar y configurar rutas de posts
 * Incluye operaciones CRUD completas con autenticación
 */
try {
  console.log('🔍 Cargando rutas de posts...');
  const postRoutes = require('./src/routes/postRoutes_orig'); // Usar versión completa
  app.use('/api/posts', postRoutes);
  console.log('✅ Rutas de posts cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas de posts:', error.message);
}

/**
 * Middleware para manejar rutas no encontradas (404)
 * Se ejecuta cuando ninguna ruta coincide con la petición
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
 * Captura todos los errores y los formatea consistentemente
 */
app.use(errorHandler);

/**
 * Función para inicializar la aplicación completa
 * Conecta a la base de datos y luego inicia el servidor HTTP
 */
const initializeApp = async () => {
  await startServer(); // Conectar a MongoDB
  
  // Iniciar servidor HTTP
  app.listen(PORT, () => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📚 Documentación disponible en: ${baseUrl}/api-docs`);
    console.log(`🌐 API disponible en: ${baseUrl}`);
    console.log(`👥 Usuarios: ${baseUrl}/api/users`);
    console.log(`📝 Posts: ${baseUrl}/api/posts`);
    console.log(`🔐 Autenticación OAuth:`);
    console.log(`   - Google: ${baseUrl}/api/auth/google`);
    console.log(`   - GitHub: ${baseUrl}/api/auth/github`);
    console.log('');
    console.log('✅ SocialConnect API lista para usar!');
  });
};

// Ejecutar la aplicación
initializeApp().catch(console.error);

module.exports = app;