// server.js - Archivo principal del servidor
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Importar configuración de base de datos
const connectDB = require('./src/config/database');

// Importar rutas
const userRoutes = require('./src/routes/userRoutes');
const postRoutes = require('./src/routes/postRoutes');

// Importar middleware personalizado
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a la base de datos
// Esta función establece la conexión con MongoDB usando Mongoose
connectDB();

// Middleware de seguridad
// helmet() añade varios headers HTTP para mejorar la seguridad
app.use(helmet());

// Middleware para permitir CORS (Cross-Origin Resource Sharing)
// Permite que el frontend pueda hacer peticiones a esta API
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Middleware para parsear JSON
// express.json() permite que el servidor pueda leer datos JSON del body de las peticiones
app.use(express.json({ limit: '10mb' }));

// Middleware para parsear datos de formularios URL-encoded
app.use(express.urlencoded({ extended: true }));

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
  apis: ['./src/routes/*.js', './src/models/*.js']
};

// swaggerJsdoc() genera la documentación basada en los comentarios en el código
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Ruta para servir la documentación Swagger UI
// Esta ruta permitirá acceder a la documentación interactiva en /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a SocialConnect API',
    documentation: '/api-docs',
    version: '1.0.0'
  });
});

// Rutas de la API
// Todas las rutas de usuarios estarán bajo el prefijo /api/users
app.use('/api/users', userRoutes);
// Todas las rutas de posts estarán bajo el prefijo /api/posts
app.use('/api/posts', postRoutes);

// Middleware para manejar rutas no encontradas (404)
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`
  });
});

// Middleware global para manejo de errores
// Este debe ser el último middleware ya que captura todos los errores
app.use(errorHandler);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`📚 Documentación disponible en: http://localhost:${PORT}/api-docs`);
});