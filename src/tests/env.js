// src/tests/env.js - Configuración de variables de entorno para pruebas

/**
 * Configuración de variables de entorno específicas para el entorno de testing
 * Este archivo se ejecuta antes de todas las pruebas para configurar el entorno
 */

// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test';

// Base de datos de pruebas (separada de desarrollo y producción)
process.env.MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/socialconnect_test';

// Puerto diferente para evitar conflictos
process.env.PORT = process.env.TEST_PORT || '3001';

// JWT secrets para testing (pueden ser diferentes de producción)
process.env.JWT_SECRET = process.env.JWT_TEST_SECRET || 'test_jwt_secret_for_testing_only';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_TEST_SECRET || 'test_refresh_secret_for_testing_only';
process.env.JWT_REFRESH_EXPIRE = '7d';

// URL de la API para testing
process.env.API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Frontend URL para CORS (puede ser mock en testing)
process.env.FRONTEND_URL = process.env.TEST_FRONTEND_URL || 'http://localhost:3000';

// OAuth configs para testing (pueden ser mocks)
process.env.GOOGLE_CLIENT_ID = process.env.TEST_GOOGLE_CLIENT_ID || 'test_google_client_id';
process.env.GOOGLE_CLIENT_SECRET = process.env.TEST_GOOGLE_CLIENT_SECRET || 'test_google_client_secret';
process.env.GITHUB_CLIENT_ID = process.env.TEST_GITHUB_CLIENT_ID || 'test_github_client_id';
process.env.GITHUB_CLIENT_SECRET = process.env.TEST_GITHUB_CLIENT_SECRET || 'test_github_client_secret';

// Email configs para testing (deshabilitado o mock)
process.env.EMAIL_HOST = 'localhost';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test_password';

// Configuraciones específicas para testing

// Deshabilitar logs de Mongoose durante testing
process.env.MONGOOSE_DEBUG = 'false';

// Configurar timeout más bajo para tests más rápidos
process.env.REQUEST_TIMEOUT = '5000';

// Habilitar modo verbose solo si se especifica
if (process.argv.includes('--verbose')) {
  process.env.VERBOSE_TESTS = 'true';
}

// Configurar límites más bajos para testing
process.env.MAX_FILE_SIZE = '5mb';
process.env.RATE_LIMIT_WINDOW = '1';
process.env.RATE_LIMIT_MAX = '1000';

// Configuraciones de seguridad para testing
process.env.BCRYPT_ROUNDS = '4'; // Menos rounds para tests más rápidos
process.env.CORS_ORIGIN = '*'; // Permitir todos los orígenes en testing

// Logging level para testing
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL || 'error';

// Configuraciones de base de datos específicas para testing
process.env.DB_POOL_SIZE = '5';
process.env.DB_TIMEOUT = '5000';

// Mock de servicios externos si es necesario
if (process.env.MOCK_EXTERNAL_SERVICES === 'true') {
  // Configurar mocks para servicios externos
  process.env.DISABLE_OAUTH = 'true';
  process.env.DISABLE_EMAIL = 'true';
  process.env.DISABLE_UPLOADS = 'true';
}

// Configurar timezone para tests consistentes
process.env.TZ = 'UTC';

// Información de debug para desarrollo de tests
if (process.env.DEBUG_TESTS === 'true') {
  console.log('🧪 Test Environment Configuration:');
  console.log('📂 Database:', process.env.MONGODB_URI);
  console.log('🚀 Port:', process.env.PORT);
  console.log('🔐 JWT Secret length:', process.env.JWT_SECRET.length);
  console.log('🌍 API URL:', process.env.API_URL);
  console.log('⚙️  Node Environment:', process.env.NODE_ENV);
}s