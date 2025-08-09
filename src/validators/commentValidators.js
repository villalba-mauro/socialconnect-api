// src/validators/commentValidators.js - Validadores corregidos para comentarios
const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware para manejar los resultados de validación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: formattedErrors
    });
  }
  
  next();
};

/**
 * Validaciones para crear un nuevo comentario
 */
const validateCreateComment = [
  // Validar postId
  body('postId')
    .isMongoId()
    .withMessage('ID de post inválido'),

  // Validar content
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('El contenido del comentario debe tener entre 1 y 500 caracteres')
    .custom((value) => {
      if (!value || value.trim().length === 0) {
        throw new Error('El contenido del comentario no puede estar vacío');
      }
      return true;
    }),

  // 🔧 ARREGLADO: Validar parentCommentId (opcional) - manejar null correctamente
  body('parentCommentId')
    .optional({ nullable: true, checkFalsy: false })  // ← Permite null y undefined
    .custom((value) => {
      // Si el valor existe y no es null, debe ser un MongoId válido
      if (value !== null && value !== undefined && value !== '') {
        if (!require('mongoose').Types.ObjectId.isValid(value)) {
          throw new Error('ID de comentario padre inválido');
        }
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validaciones para actualizar un comentario
 */
const validateUpdateComment = [
  // Validar content
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('El contenido del comentario debe tener entre 1 y 500 caracteres')
    .custom((value) => {
      if (!value || value.trim().length === 0) {
        throw new Error('El contenido del comentario no puede estar vacío');
      }
      return true;
    }),

  handleValidationErrors
];

/**
 * Validación de parámetros de ID de comentario
 */
const validateCommentId = [
  param('id')
    .isMongoId()
    .withMessage('ID de comentario inválido'),

  handleValidationErrors
];

/**
 * Validación de parámetros de ID de post
 */
const validatePostId = [
  param('postId')
    .isMongoId()
    .withMessage('ID de post inválido'),

  handleValidationErrors
];

/**
 * Validación de parámetros de ID de usuario
 */
const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('ID de usuario inválido'),

  handleValidationErrors
];

/**
 * Validaciones para parámetros de consulta
 */
const validateQueryParams = [
  // Validar página
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0')
    .toInt(),

  // Validar límite
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100')
    .toInt(),

  // Validar ordenamiento
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'likesCount'])
    .withMessage('El campo de ordenamiento debe ser: createdAt, updatedAt o likesCount'),

  // Validar orden
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('El orden debe ser "asc" o "desc"'),

  handleValidationErrors
];

module.exports = {
  validateCreateComment,
  validateUpdateComment,
  validateCommentId,
  validatePostId,
  validateUserId,
  validateQueryParams,
  handleValidationErrors
};