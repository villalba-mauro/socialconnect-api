// src/validators/likeValidators.js - Validadores para operaciones de likes
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
 * Validaciones para crear un nuevo like
 */
const validateCreateLike = [
  // Validar targetType
  body('targetType')
    .isIn(['Post', 'Comment'])
    .withMessage('El tipo de objetivo debe ser "Post" o "Comment"'),

  // Validar targetId
  body('targetId')
    .isMongoId()
    .withMessage('ID de objetivo inválido'),

  handleValidationErrors
];

/**
 * Validaciones para toggle like
 */
const validateToggleLike = [
  // Validar targetType
  body('targetType')
    .isIn(['Post', 'Comment'])
    .withMessage('El tipo de objetivo debe ser "Post" o "Comment"'),

  // Validar targetId
  body('targetId')
    .isMongoId()
    .withMessage('ID de objetivo inválido'),

  handleValidationErrors
];

/**
 * Validación de parámetros de ID de like
 */
const validateLikeId = [
  param('id')
    .isMongoId()
    .withMessage('ID de like inválido'),

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
 * Validación de parámetros de ID de comentario
 */
const validateCommentId = [
  param('commentId')
    .isMongoId()
    .withMessage('ID de comentario inválido'),

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
 * Validaciones para verificar like
 */
const validateCheckLike = [
  // Validar targetType
  param('targetType')
    .isIn(['Post', 'Comment'])
    .withMessage('El tipo de objetivo debe ser "Post" o "Comment"'),

  // Validar targetId
  param('targetId')
    .isMongoId()
    .withMessage('ID de objetivo inválido'),

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
    .isIn(['createdAt', 'updatedAt'])
    .withMessage('El campo de ordenamiento debe ser: createdAt o updatedAt'),

  // Validar orden
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('El orden debe ser "asc" o "desc"'),

  // Validar filtro de tipo
  query('targetType')
    .optional()
    .isIn(['Post', 'Comment'])
    .withMessage('El tipo de filtro debe ser "Post" o "Comment"'),

  handleValidationErrors
];

module.exports = {
  validateCreateLike,
  validateToggleLike,
  validateLikeId,
  validatePostId,
  validateCommentId,
  validateUserId,
  validateCheckLike,
  validateQueryParams,
  handleValidationErrors
};