// src/validators/postValidators.js - Validadores para operaciones de posts
const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware para manejar los resultados de validación
 * Verifica si hay errores de validación y los formatea para enviar al cliente
 * 
 * @param {Object} req - Objeto de petición de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
const handleValidationErrors = (req, res, next) => {
  // Obtener los errores de validación
  const errors = validationResult(req);
  
  // Si hay errores, formatearlos y enviar respuesta de error
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,              // Campo que falló la validación
      message: error.msg,             // Mensaje de error
      value: error.value              // Valor que falló
    }));

    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: formattedErrors
    });
  }
  
  // Si no hay errores, continuar al siguiente middleware
  next();
};

/**
 * Validaciones para crear un nuevo post
 * Valida el contenido y la imagen opcional
 */
const validateCreatePost = [
  // Validar contenido del post
  body('content')
    .trim()                                           // Eliminar espacios al inicio y final
    .isLength({ min: 1, max: 2000 })                 // Entre 1 y 2000 caracteres
    .withMessage('El contenido del post debe tener entre 1 y 2000 caracteres')
    .custom((value) => {
      // Verificar que no sea solo espacios en blanco
      if (!value || value.trim().length === 0) {
        throw new Error('El contenido no puede estar vacío');
      }
      return true;
    }),

  // Validar URL de imagen (opcional)
  body('imageUrl')
    .optional()
    .isURL()                                          // Debe ser una URL válida
    .withMessage('La URL de la imagen debe ser válida')
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)          // Debe terminar en extensión de imagen
    .withMessage('La imagen debe tener una extensión válida (jpg, jpeg, png, gif, webp)'),

  // Validar etiquetas (opcional)
  body('tags')
    .optional()
    .isArray()                                        // Debe ser un array
    .withMessage('Las etiquetas deben ser un array')
    .custom((tags) => {
      // Validar cada etiqueta individualmente
      if (tags && Array.isArray(tags)) {
        // Verificar que no haya más de 10 etiquetas
        if (tags.length > 10) {
          throw new Error('No se pueden agregar más de 10 etiquetas');
        }
        
        // Validar cada etiqueta
        tags.forEach((tag, index) => {
          if (typeof tag !== 'string') {
            throw new Error(`La etiqueta en posición ${index} debe ser un texto`);
          }
          if (tag.trim().length === 0) {
            throw new Error(`La etiqueta en posición ${index} no puede estar vacía`);
          }
          if (tag.length > 50) {
            throw new Error(`La etiqueta en posición ${index} no puede exceder 50 caracteres`);
          }
          // Verificar que solo contenga letras, números y guiones
          if (!/^[a-zA-Z0-9\-_]+$/.test(tag.trim())) {
            throw new Error(`La etiqueta "${tag}" solo puede contener letras, números, guiones y guiones bajos`);
          }
        });
      }
      return true;
    }),

  // Aplicar validaciones
  handleValidationErrors
];

/**
 * Validaciones para actualizar un post
 * Similares a crear post pero todos los campos son opcionales
 */
const validateUpdatePost = [
  // Validar contenido del post (opcional)
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('El contenido del post debe tener entre 1 y 2000 caracteres')
    .custom((value) => {
      // Si se proporciona contenido, verificar que no sea solo espacios
      if (value !== undefined && (!value || value.trim().length === 0)) {
        throw new Error('El contenido no puede estar vacío');
      }
      return true;
    }),

  // Validar URL de imagen (opcional)
  body('imageUrl')
    .optional()
    .custom((value) => {
      // Si se proporciona imageUrl y no es null, validar
      if (value !== null && value !== undefined) {
        // Debe ser una URL válida
        const urlRegex = /^https?:\/\/.+/;
        if (!urlRegex.test(value)) {
          throw new Error('La URL de la imagen debe ser válida');
        }
        
        // Debe tener extensión de imagen
        const imageRegex = /\.(jpg|jpeg|png|gif|webp)$/i;
        if (!imageRegex.test(value)) {
          throw new Error('La imagen debe tener una extensión válida (jpg, jpeg, png, gif, webp)');
        }
      }
      return true;
    }),

  // Validar etiquetas (opcional)
  body('tags')
    .optional()
    .isArray()
    .withMessage('Las etiquetas deben ser un array')
    .custom((tags) => {
      // Validar cada etiqueta si se proporcionan
      if (tags && Array.isArray(tags)) {
        if (tags.length > 10) {
          throw new Error('No se pueden agregar más de 10 etiquetas');
        }
        
        tags.forEach((tag, index) => {
          if (typeof tag !== 'string') {
            throw new Error(`La etiqueta en posición ${index} debe ser un texto`);
          }
          if (tag.trim().length === 0) {
            throw new Error(`La etiqueta en posición ${index} no puede estar vacía`);
          }
          if (tag.length > 50) {
            throw new Error(`La etiqueta en posición ${index} no puede exceder 50 caracteres`);
          }
          if (!/^[a-zA-Z0-9\-_]+$/.test(tag.trim())) {
            throw new Error(`La etiqueta "${tag}" solo puede contener letras, números, guiones y guiones bajos`);
          }
        });
      }
      return true;
    }),

  // Aplicar validaciones
  handleValidationErrors
];

/**
 * Validación de parámetros de ID de post
 */
const validatePostId = [
  // Validar que el ID sea un ObjectId válido de MongoDB
  param('id')
    .isMongoId()
    .withMessage('ID de post inválido'),

  // Aplicar validaciones
  handleValidationErrors
];

/**
 * Validación de parámetros de ID de usuario para obtener sus posts
 */
const validateUserIdParam = [
  // Validar que el ID de usuario sea un ObjectId válido
  param('userId')
    .isMongoId()
    .withMessage('ID de usuario inválido'),

  // Aplicar validaciones
  handleValidationErrors
];

/**
 * Validaciones para parámetros de consulta (query parameters)
 * Para paginación y filtros en GET requests
 */
const validateQueryParams = [
  // Validar parámetro de página
  query('page')
    .optional()
    .isInt({ min: 1 })                                // Debe ser un entero positivo
    .withMessage('La página debe ser un número entero mayor a 0')
    .toInt(),                                         // Convertir a entero

  // Validar parámetro de límite
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })                     // Entre 1 y 100
    .withMessage('El límite debe ser un número entre 1 y 100')
    .toInt(),                                         // Convertir a entero

  // Validar parámetro de ordenamiento
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'likesCount', 'commentsCount'])  // Solo campos permitidos
    .withMessage('El campo de ordenamiento debe ser: createdAt, updatedAt, likesCount o commentsCount'),

  // Validar orden de ordenamiento
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])                           // Solo ascendente o descendente
    .withMessage('El orden debe ser "asc" o "desc"'),

  // Validar búsqueda por etiquetas
  query('tags')
    .optional()
    .custom((value) => {
      // Si se proporciona tags, puede ser un string o array de strings
      if (typeof value === 'string') {
        // Si es string, verificar que sea válido
        if (value.trim().length === 0) {
          throw new Error('La etiqueta de búsqueda no puede estar vacía');
        }
      } else if (Array.isArray(value)) {
        // Si es array, verificar cada elemento
        value.forEach((tag, index) => {
          if (typeof tag !== 'string' || tag.trim().length === 0) {
            throw new Error(`La etiqueta en posición ${index} debe ser un texto válido`);
          }
        });
      } else {
        throw new Error('Las etiquetas deben ser un texto o array de textos');
      }
      return true;
    }),

  // Aplicar validaciones
  handleValidationErrors
];

module.exports = {
  validateCreatePost,
  validateUpdatePost,
  validatePostId,
  validateUserIdParam,
  validateQueryParams,
  handleValidationErrors
};