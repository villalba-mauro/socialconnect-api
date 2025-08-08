// server.js - Versión con middleware de debug de peticiones
require('dotenv').config(); // CARGAR VARIABLES PRIMERO

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
 * MIDDLEWARE DE DEBUG PARA TODAS LAS PETICIONES
 * Este middleware se ejecuta ANTES de todo para ver qué está pasando
 */
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`🔧 [REQUEST] ${timestamp} - ${req.method} ${req.url}`);
  
  // Debug especial para rutas auth
  if (req.url.startsWith('/api/auth')) {
    console.log(`🎯 [AUTH-REQUEST] Petición OAuth detectada: ${req.method} ${req.url}`);
    console.log(`🎯 [AUTH-REQUEST] Headers:`, req.headers);
  }
  
  next();
});

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
  console.log('✅ Passport OAuth inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando Passport OAuth:', error.message);
}

/**
 * Middleware para parsear peticiones JSON
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

console.log('✅ Middleware configurado');

/**
 * Configuración de Swagger
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SocialConnect API',
      version: '1.0.0',
      description: 'API backend para plataforma de redes sociales con OAuth, JWT y operaciones CRUD completas'
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
 * Ruta de bienvenida
 */
app.get('/', (req, res) => {
  console.log('🏠 [HOME] Ruta home ejecutada');
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const githubConfigured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  
  res.json({
    message: 'Bienvenido a SocialConnect API',
    documentation: `${baseUrl}/api-docs`,
    version: '1.0.0',
    status: 'funcionando ✅',
    environment: process.env.NODE_ENV || 'development',
    oauth: {
      google: googleConfigured ? 'Configurado ✅' : 'No configurado ❌',
      github: githubConfigured ? 'Configurado ✅' : 'No configurado ❌'
    },
    endpoints: {
      users: `${baseUrl}/api/users`,
      posts: `${baseUrl}/api/posts`,
      auth: `${baseUrl}/api/auth`,
      docs: `${baseUrl}/api-docs`,
      debug: `${baseUrl}/debug/routes`
    }
  });
});

/**
 * Configuración de Swagger UI
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log('✅ Swagger UI configurado en /api-docs');

/**
 * MIDDLEWARE DE DEBUG ESPECÍFICO PARA /api/auth ANTES DE CARGAR RUTAS
 */
app.use('/api/auth', (req, res, next) => {
  console.log(`🎯 [AUTH-MIDDLEWARE] Middleware /api/auth ejecutado para: ${req.method} ${req.url}`);
  console.log(`🎯 [AUTH-MIDDLEWARE] Ruta completa: ${req.originalUrl}`);
  next();
});

/**
 * Importar y configurar rutas de autenticación OAuth - PRIORIDAD ALTA
 */
console.log('🔍 Cargando rutas de autenticación OAuth...');
try {
  const authRoutes = require('./src/routes/authRoutes');
  console.log('✅ authRoutes importado, registrando en /api/auth...');
  
  app.use('/api/auth', authRoutes);
  console.log('✅ Rutas de autenticación OAuth registradas en /api/auth');
} catch (error) {
  console.error('❌ Error cargando rutas de autenticación:', error.message);
  console.error('❌ Stack:', error.stack);
}

/**
 * Importar y configurar rutas de usuarios
 */
console.log('🔍 Cargando rutas de usuarios...');
try {
  const userRoutes = require('./src/routes/userRoutes_orig');
  app.use('/api/users', userRoutes);
  console.log('✅ Rutas de usuarios cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas de usuarios:', error.message);
}

/**
 * Importar y configurar rutas de posts
 */
console.log('🔍 Cargando rutas de posts...');
try {
  const postRoutes = require('./src/routes/postRoutes_orig');
  app.use('/api/posts', postRoutes);
  console.log('✅ Rutas de posts cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas de posts:', error.message);
}

/**
 * RUTA DE DEBUG PARA VERIFICAR RUTAS REGISTRADAS
 */
app.get('/debug/routes', (req, res) => {
  console.log('🔧 [DEBUG] Endpoint /debug/routes ejecutado');
  
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
            router: middleware.regexp.toString()
          });
        }
      });
    }
  });
  
  res.json({
    success: true,
    message: 'Rutas registradas en Express',
    totalRoutes: routes.length,
    routes,
    timestamp: new Date().toISOString()
  });
});

/**
 * RUTA DE TEST ESPECÍFICA PARA VERIFICAR QUE /api/auth FUNCIONA
 */
app.get('/api/auth/direct-test', (req, res) => {
  console.log('🎯 [DIRECT-TEST] Ruta directa /api/auth/direct-test ejecutada');
  res.json({
    success: true,
    message: 'Ruta directa de test OAuth funcionando',
    timestamp: new Date().toISOString(),
    url: req.originalUrl,
    method: req.method
  });
});

/**
 * Middleware para manejar rutas no encontradas (404) - AL FINAL
 */
app.use('*', (req, res) => {
  console.log(`❌ [404] Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`,
    debug: {
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    },
    availableEndpoints: {
      home: '/',
      documentation: '/api-docs',
      users: '/api/users',
      posts: '/api/posts',
      auth: '/api/auth',
      debug: '/debug/routes',
      authTest: '/api/auth/direct-test'
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
    console.log(`🎯 Test directo OAuth: ${baseUrl}/api/auth/direct-test`);
    console.log(`🔧 Debug rutas: ${baseUrl}/debug/routes`);
    console.log('');
    console.log('🎯 PRUEBAS RECOMENDADAS:');
    console.log('1. Primero: http://localhost:3000/api/auth/direct-test');
    console.log('2. Después: http://localhost:3000/api/auth/test');
    console.log('3. Finalmente: http://localhost:3000/api/auth/google');
    console.log('');
    console.log('✅ Servidor listo para debug intensivo!');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Puerto ${PORT} está ocupado.`);
      process.exit(1);
    } else {
      console.error('❌ Error del servidor:', error);
    }
  });
};

// Ejecutar la aplicación
initializeApp().catch(console.error);

module.exports = app;