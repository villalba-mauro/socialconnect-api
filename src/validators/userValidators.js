// src/validators/userValidators.js - Validadores para operaciones de usuarios
const { body, param, validationResult } = require('express-validator');
const { createError } = require('../middleware/errorHandler');

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
 * Validaciones para crear un nuevo usuario (registro)
 * Valida todos los campos requeridos y sus formatos
 */
const validateCreateUser = [
  // Validar username
  body('username')
    .trim()                                           // Eliminar espacios
    .isLength({ min: 3, max: 30 })                   // Longitud entre 3 y 30 caracteres
    .withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)                      // Solo letras, números y guión bajo
    .withMessage('El nombre de usuario solo puede contener letras, números y guión bajo')
    .custom(async (value) => {
      // Verificar si el username ya existe
      const User = require('../models/User');
      const existingUser = await User.findOne({ username: value });
      if (existingUser) {
        throw new Error('Este nombre de usuario ya está en uso');
      }
      return true;
    }),

  // Validar email
  body('email')
    .trim()
    .isEmail()                                        // Debe ser un email válido
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail()                                 // Normalizar el email
    .custom(async (value) => {
      // Verificar si el email ya existe
      const User = require('../models/User');
      const existingUser = await User.findOne({ email: value });
      if (existingUser) {
        throw new Error('Este email ya está registrado');
      }
      return true;
    }),

  // Validar password
  body('password')
    .isLength({ min: 6 })                            // Mínimo 6 caracteres
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)      // Debe tener mayúscula, minúscula y número
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),

  // Validar firstName
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })                   // Entre 1 y 50 caracteres
    .withMessage('El nombre debe tener entre 1 y 50 caracteres')
    .matches(/^[a-zA-ZÁáÉéÍíÓóÚúÑñ\s]+$/)           // Solo letras y espacios
    .withMessage('El nombre solo puede contener letras'),

  // Validar lastName
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })                   // Entre 1 y 50 caracteres
    .withMessage('El apellido debe tener entre 1 y 50 caracteres')
    .matches(/^[a-zA-ZÁáÉéÍíÓóÚúÑñ\s]+$/)           // Solo letras y espacios
    .withMessage('El apellido solo puede contener letras'),

  // Validar profilePicture (opcional)
  body('profilePicture')
    .optional()
    .isURL()                                          // Debe ser una URL válida
    .withMessage('La foto de perfil debe ser una URL válida')
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)          // Debe terminar en extensión de imagen
    .withMessage('La foto de perfil debe ser una imagen (jpg, jpeg, png, gif, webp)'),

  // Validar bio (opcional)
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })                          // Máximo 500 caracteres
    .withMessage('La biografía no puede exceder 500 caracteres'),

  // Aplicar validaciones
  handleValidationErrors
];

/**
 * Validaciones para actualizar un usuario
 * Similar a crear usuario pero todos los campos son opcionales
 */
const validateUpdateUser = [
  // Validar username (opcional)
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guión bajo')
    .custom(async (value, { req }) => {
      // Verificar si el username ya existe (excluyendo el usuario actual)
      const User = require('../models/User');
      const existingUser = await User.findOne({ 
        username: value, 
        _id: { $ne: req.params.id }                   // Excluir el usuario actual
      });
      if (existingUser) {
        throw new Error('Este nombre de usuario ya está en uso');
      }
      return true;
    }),

  // Validar email (opcional)
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail()
    .custom(async (value, { req }) => {
      // Verificar si el email ya existe (excluyendo el usuario actual)
      const User = require('../models/User');
      const existingUser = await User.findOne({ 
        email: value, 
        _id: { $ne: req.params.id }
      });
      if (existingUser) {
        throw new Error('Este email ya está registrado');
      }
      return true;
    }),

  // Validar firstName (opcional)
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El nombre debe tener entre 1 y 50 caracteres')
    .matches(/^[a-zA-ZÁáÉéÍíÓóÚúÑñ\s]+$/)
    .withMessage('El nombre solo puede contener letras'),

  // Validar lastName (opcional)
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('El apellido debe tener entre 1 y 50 caracteres')
    .matches(/^[a-zA-ZÁáÉéÍíÓóÚúÑñ\s]+$/)
    .withMessage('El apellido solo puede contener letras'),

  // Validar profilePicture (opcional)
  body('profilePicture')
    .optional()
    .isURL()
    .withMessage('La foto de perfil debe ser una URL válida')
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)
    .withMessage('La foto de perfil debe ser una imagen válida'),

  // Validar bio (opcional)
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La biografía no puede exceder 500 caracteres'),

  // Aplicar validaciones
  handleValidationErrors
];

/**
 * Validaciones para login de usuario
 */
const validateLogin = [
  // Validar email o username
  body('emailOrUsername')
    .trim()
    .notEmpty()
    .withMessage('Debe proporcionar email o nombre de usuario'),

  // Validar password
  body('password')
    .notEmpty()
    .withMessage('Debe proporcionar una contraseña'),

  // Aplicar validaciones
  handleValidationErrors
];

/**
 * Validaciones para cambio de contraseña
 */
const validateChangePassword = [
  // Validar contraseña actual
  body('currentPassword')
    .notEmpty()
    .withMessage('Debe proporcionar la contraseña actual'),

  // Validar nueva contraseña
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos una mayúscula, una minúscula y un número')
    .custom((value, { req }) => {
      // Verificar que la nueva contraseña sea diferente a la actual
      if (value === req.body.currentPassword) {
        throw new Error('La nueva contraseña debe ser diferente a la actual');
      }
      return true;
    }),

  // Validar confirmación de contraseña
  body('confirmPassword')
    .custom((value, { req }) => {
      // Verificar que las contraseñas coincidan
      if (value !== req.body.newPassword) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),

  // Aplicar validaciones
  handleValidationErrors
];

/**
 * Validación de parámetros de ID
 */
const validateUserId = [
  // Validar que el ID sea un ObjectId válido de MongoDB
  param('id')
    .isMongoId()
    .withMessage('ID de usuario inválido'),

  // Aplicar validaciones
  handleValidationErrors
];

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateLogin,
  validateChangePassword,
  validateUserId,
  handleValidationErrors
};