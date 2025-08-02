// src/middleware/auth.js - Middleware de autenticación y autorización
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler, createError } = require('./errorHandler');

/**
 * Middleware para verificar si el usuario está autenticado
 * Verifica el token JWT en el header Authorization
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Verificar si el header Authorization existe y tiene el formato correcto
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extraer el token del header (formato: "Bearer TOKEN")
      token = req.headers.authorization.split(' ')[1];

      // Verificar el token usando la clave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscar al usuario en la base de datos usando el ID del token
      const currentUser = await User.findById(decoded.id).select('-password');

      // Verificar que el usuario existe y está activo
      if (!currentUser) {
        throw createError('Usuario no encontrado', 401);
      }

      if (!currentUser.isActive) {
        throw createError('Cuenta de usuario inactiva', 401);
      }

      // Agregar el usuario al objeto req para usarlo en otros middlewares/controladores
      req.user = currentUser;

      // Continuar al siguiente middleware
      next();
    } catch (error) {
      throw createError('Token de autorización inválido', 401);
    }
  }

  // Si no hay token en los headers
  if (!token) {
    throw createError('Acceso denegado. No se proporcionó token de autorización', 401);
  }
});

/**
 * Middleware para verificar si el usuario tiene permisos para modificar un recurso
 * Verifica que el usuario autenticado sea el propietario del recurso
 * 
 * @param {string} resourceUserField - Campo que contiene el ID del usuario propietario
 * @returns {Function} - Middleware function
 */
const authorize = (resourceUserField = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    // Obtener el ID del recurso desde los parámetros de la URL
    const resourceId = req.params.id || req.params.userId || req.params.postId;

    // Determinar qué modelo buscar basado en la ruta
    let Model;
    if (req.route.path.includes('posts')) {
      Model = require('../models/Post');
    } else if (req.route.path.includes('users')) {
      Model = require('../models/User');
    }

    if (Model && resourceId) {
      // Buscar el recurso en la base de datos
      const resource = await Model.findById(resourceId);

      if (!resource) {
        throw createError('Recurso no encontrado', 404);
      }

      // Verificar que el usuario autenticado sea el propietario
      const resourceOwnerId = resource[resourceUserField] || resource._id;
      
      if (resourceOwnerId.toString() !== req.user._id.toString()) {
        throw createError('No tienes permisos para realizar esta acción', 403);
      }
    }

    next();
  });
};

/**
 * Middleware opcional de autenticación
 * No requiere autenticación pero si hay token válido, añade el usuario al req
 * Útil para rutas que pueden mostrar contenido diferente si el usuario está logueado
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Verificar si hay token en los headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extraer el token
      token = req.headers.authorization.split(' ')[1];

      // Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscar al usuario
      const currentUser = await User.findById(decoded.id).select('-password');

      // Si el usuario existe y está activo, añadirlo al req
      if (currentUser && currentUser.isActive) {
        req.user = currentUser;
      }
    } catch (error) {
      // Si hay error con el token, simplemente continuar sin usuario
      // No lanzar error porque la autenticación es opcional
      console.log('Token inválido en autenticación opcional:', error.message);
    }
  }

  // Continuar siempre (con o sin usuario)
  next();
});

/**
 * Función para generar tokens JWT
 * 
 * @param {string} userId - ID del usuario
 * @returns {Object} - Objeto con access token y refresh token
 */
const generateTokens = (userId) => {
  // Access token (corta duración)
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  // Refresh token (larga duración)
  const refreshToken = jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return {
    accessToken,
    refreshToken
  };
};

/**
 * Función para verificar refresh token y generar nuevo access token
 * 
 * @param {string} refreshToken - Refresh token a verificar
 * @returns {Object} - Nuevo access token
 */
const refreshAccessToken = asyncHandler(async (refreshToken) => {
  try {
    // Verificar el refresh token
    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Verificar que es un refresh token
    if (decoded.type !== 'refresh') {
      throw createError('Token inválido', 401);
    }

    // Verificar que el usuario existe
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw createError('Usuario no encontrado o inactivo', 401);
    }

    // Generar nuevo access token
    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    return { accessToken };
  } catch (error) {
    throw createError('Refresh token inválido', 401);
  }
});

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  generateTokens,
  refreshAccessToken
};