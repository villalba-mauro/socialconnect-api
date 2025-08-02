// src/middleware/errorHandler.js - Middleware global para manejo de errores

/**
 * Middleware global para manejo de errores
 * Este middleware captura todos los errores que ocurren en la aplicación
 * y los formatea de manera consistente para enviar al cliente
 * 
 * @param {Error} err - El error que ocurrió
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
const errorHandler = (err, req, res, next) => {
  // Crear una copia del error para no modificar el original
  let error = { ...err };
  error.message = err.message;

  // Log del error para debugging (en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err);
    console.error('Stack:', err.stack);
  }

  // Error de validación de Mongoose (cuando los datos no cumplen el schema)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message: `Error de validación: ${message}`,
      statusCode: 400
    };
  }

  // Error de casting de Mongoose (cuando el ID no es válido)
  if (err.name === 'CastError') {
    error = {
      message: 'ID de recurso no válido',
      statusCode: 400
    };
  }

  // Error de duplicado de Mongoose (cuando se intenta crear un registro con un campo único duplicado)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = {
      message: `Ya existe un registro con ${field}: ${value}`,
      statusCode: 400
    };
  }

  // Error de JWT malformado
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Token de autorización inválido',
      statusCode: 401
    };
  }

  // Error de JWT expirado
  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token de autorización expirado',
      statusCode: 401
    };
  }

  // Determinar el código de estado HTTP
  const statusCode = error.statusCode || err.statusCode || 500;

  // Determinar el mensaje de error
  let message = error.message || err.message || 'Error interno del servidor';

  // En producción, no mostrar detalles específicos de errores internos
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Error interno del servidor';
  }

  // Estructura de respuesta de error consistente
  const errorResponse = {
    success: false,
    error: message,
    statusCode: statusCode
  };

  // En desarrollo, incluir información adicional para debugging
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err;
  }

  // Enviar respuesta de error
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para capturar errores asíncronos
 * Envuelve funciones async/await para capturar errores automáticamente
 * 
 * @param {Function} fn - Función asíncrona a envolver
 * @returns {Function} - Función middleware que maneja errores
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Crear un error personalizado con mensaje y código de estado
 * 
 * @param {string} message - Mensaje del error
 * @param {number} statusCode - Código de estado HTTP
 * @returns {Error} - Error personalizado
 */
const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = {
  errorHandler,
  asyncHandler,
  createError
};