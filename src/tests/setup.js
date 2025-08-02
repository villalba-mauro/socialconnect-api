// src/tests/setup.js - Configuración inicial para las pruebas

/**
 * Archivo de configuración que se ejecuta una vez antes de todas las pruebas
 * Configura el entorno de testing y utilidades globales
 */

// Configurar timeouts más largos para operaciones de base de datos
jest.setTimeout(30000);

// Suprimir logs durante las pruebas para mantener la salida limpia
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Solo mostrar logs en modo verbose o si hay errores críticos
beforeAll(() => {
  if (process.env.VERBOSE_TESTS !== 'true') {
    console.log = jest.fn();
    console.warn = jest.fn();
    // Mantener console.error para errores importantes
    console.error = (...args) => {
      // Solo mostrar errores que no sean de prueba
      if (!args[0]?.toString().includes('ValidationError') && 
          !args[0]?.toString().includes('CastError')) {
        originalConsoleError(...args);
      }
    };
  }
});

// Restaurar logs después de las pruebas
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Configurar matchers personalizados para Jest
expect.extend({
  /**
   * Matcher personalizado para verificar estructura de respuesta de API
   * @param {Object} received - Respuesta recibida
   * @param {boolean} expectedSuccess - Si se espera success: true o false
   */
  toHaveApiStructure(received, expectedSuccess = true) {
    const pass = 
      typeof received === 'object' &&
      received !== null &&
      typeof received.success === 'boolean' &&
      received.success === expectedSuccess &&
      (expectedSuccess ? 
        (typeof received.message === 'string' && typeof received.data === 'object') :
        typeof received.error === 'string'
      );

    if (pass) {
      return {
        message: () => `Expected response not to have valid API structure`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected response to have valid API structure with success: ${expectedSuccess}`,
        pass: false
      };
    }
  },

  /**
   * Matcher personalizado para verificar estructura de paginación
   * @param {Object} received - Objeto de paginación recibido
   */
  toHavePaginationStructure(received) {
    const requiredFields = ['currentPage', 'totalPages', 'hasNextPage', 'hasPrevPage', 'limit'];
    const pass = 
      typeof received === 'object' &&
      received !== null &&
      requiredFields.every(field => received.hasOwnProperty(field)) &&
      typeof received.currentPage === 'number' &&
      typeof received.totalPages === 'number' &&
      typeof received.hasNextPage === 'boolean' &&
      typeof received.hasPrevPage === 'boolean' &&
      typeof received.limit === 'number';

    if (pass) {
      return {
        message: () => `Expected object not to have valid pagination structure`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected object to have valid pagination structure with fields: ${requiredFields.join(', ')}`,
        pass: false
      };
    }
  },

  /**
   * Matcher personalizado para verificar que un array está ordenado por fecha
   * @param {Array} received - Array de objetos con campo de fecha
   * @param {string} dateField - Campo de fecha a verificar
   * @param {string} order - 'asc' o 'desc'
   */
  toBeSortedByDate(received, dateField = 'createdAt', order = 'desc') {
    if (!Array.isArray(received)) {
      return {
        message: () => `Expected an array but received ${typeof received}`,
        pass: false
      };
    }

    if (received.length <= 1) {
      return {
        message: () => `Array has ${received.length} elements, sorting cannot be verified`,
        pass: true
      };
    }

    let isSorted = true;
    for (let i = 0; i < received.length - 1; i++) {
      const currentDate = new Date(received[i][dateField]);
      const nextDate = new Date(received[i + 1][dateField]);
      
      if (order === 'desc') {
        if (currentDate < nextDate) {
          isSorted = false;
          break;
        }
      } else {
        if (currentDate > nextDate) {
          isSorted = false;
          break;
        }
      }
    }

    if (isSorted) {
      return {
        message: () => `Expected array not to be sorted by ${dateField} in ${order} order`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected array to be sorted by ${dateField} in ${order} order`,
        pass: false
      };
    }
  }
});

// Utilidades globales para las pruebas
global.testUtils = {
  /**
   * Genera un ObjectId de MongoDB válido pero inexistente
   * @returns {string} ObjectId válido
   */
  generateValidObjectId() {
    const mongoose = require('mongoose');
    return new mongoose.Types.ObjectId().toString();
  },

  /**
   * Genera datos de usuario aleatorios para pruebas
   * @param {Object} overrides - Campos a sobrescribir
   * @returns {Object} Datos de usuario
   */
  generateRandomUser(overrides = {}) {
    const random = Math.random().toString(36).substring(7);
    return {
      username: `testuser_${random}`,
      email: `test_${random}@example.com`,
      password: 'Password123',
      firstName: `Test${random}`,
      lastName: `User${random}`,
      bio: `Bio for test user ${random}`,
      ...overrides
    };
  },

  /**
   * Genera datos de post aleatorios para pruebas
   * @param {string} userId - ID del usuario autor
   * @param {Object} overrides - Campos a sobrescribir
   * @returns {Object} Datos de post
   */
  generateRandomPost(userId, overrides = {}) {
    const random = Math.random().toString(36).substring(7);
    return {
      userId,
      content: `Este es un post de prueba ${random}`,
      tags: [`test_${random}`, 'automation'],
      ...overrides
    };
  },

  /**
   * Crea un token JWT válido para testing
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones adicionales
   * @returns {string} Token JWT
   */
  generateTestToken(userId, options = {}) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: userId, ...options },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: options.expiresIn || '1h' }
    );
  },

  /**
   * Espera un tiempo determinado (útil para timing en tests)
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise} Promesa que resuelve después del tiempo especificado
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Manejo de promesas no capturadas
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // No terminar el proceso durante las pruebas
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

// Manejo de excepciones no capturadas
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // No terminar el proceso durante las pruebas
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});