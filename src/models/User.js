// src/models/User.js - Modelo de Usuario para MongoDB
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Schema del Usuario
 * Define la estructura de los documentos de usuario en MongoDB
 * Incluye más de 7 campos como se requiere en el proyecto
 */
const userSchema = new mongoose.Schema({
  // Nombre de usuario único para identificar al usuario
  username: {
    type: String,
    required: [true, 'El nombre de usuario es obligatorio'],
    unique: true,
    trim: true,           // Elimina espacios al inicio y final
    minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
    maxlength: [30, 'El nombre de usuario no puede exceder 30 caracteres']
  },

  // Email del usuario, también debe ser único
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    trim: true,
    lowercase: true,      // Convierte a minúsculas automáticamente
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Formato de email inválido']
  },

  // Contraseña del usuario (será hasheada)
  password: {
    type: String,
    required: function() {
      // La contraseña es obligatoria solo si no hay OAuth provider
      return !this.oauthProvider;
    },
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
  },

  // Nombre real del usuario
  firstName: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },

  // Apellido del usuario
  lastName: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
    trim: true,
    maxlength: [50, 'El apellido no puede exceder 50 caracteres']
  },

  // URL de la foto de perfil
  profilePicture: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        // Si hay valor, debe ser una URL válida
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'La URL de la imagen debe ser válida y terminar en jpg, jpeg, png, gif o webp'
    }
  },

  // Biografía del usuario
  bio: {
    type: String,
    maxlength: [500, 'La biografía no puede exceder 500 caracteres'],
    default: ''
  },

  // Fecha de creación de la cuenta
  createdAt: {
    type: Date,
    default: Date.now
  },

  // Fecha de última actualización
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Estado de la cuenta (activa o inactiva)
  isActive: {
    type: Boolean,
    default: true
  },

  // Información para OAuth (Google, GitHub, etc.)
  oauthProvider: {
    type: String,
    enum: ['google', 'github', null],
    default: null
  },

  // ID del usuario en el proveedor OAuth
  oauthId: {
    type: String,
    default: null
  },

  // Fecha de último login
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  // Opciones del schema
  timestamps: true,     // Añade automáticamente createdAt y updatedAt
  toJSON: {            // Configuración para cuando se convierte a JSON
    transform: function(doc, ret) {
      // Eliminar la contraseña del objeto cuando se envía como respuesta
      delete ret.password;
      return ret;
    }
  }
});

/**
 * Middleware pre-save
 * Se ejecuta antes de guardar un documento
 * Hashea la contraseña si ha sido modificada
 */
userSchema.pre('save', async function(next) {
  // Si la contraseña no ha sido modificada, continúa
  if (!this.isModified('password')) return next();

  try {
    // Generar salt (valor aleatorio para hacer el hash más seguro)
    const salt = await bcrypt.genSalt(12);
    
    // Hashear la contraseña con el salt
    this.password = await bcrypt.hash(this.password, salt);
    
    // Actualizar fecha de modificación
    this.updatedAt = Date.now();
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Método de instancia para comparar contraseñas
 * Compara la contraseña en texto plano con la hasheada
 * @param {string} candidatePassword - Contraseña a verificar
 * @returns {boolean} - True si coinciden, false si no
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Método de instancia para obtener el nombre completo
 * @returns {string} - Nombre completo del usuario
 */
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

/**
 * Método de instancia para actualizar último login
 */
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Crear índices para mejorar el rendimiento de las consultas
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - firstName
 *         - lastName
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del usuario
 *         username:
 *           type: string
 *           description: Nombre de usuario único
 *           minLength: 3
 *           maxLength: 30
 *         email:
 *           type: string
 *           format: email
 *           description: Email del usuario
 *         firstName:
 *           type: string
 *           description: Nombre del usuario
 *           maxLength: 50
 *         lastName:
 *           type: string
 *           description: Apellido del usuario
 *           maxLength: 50
 *         profilePicture:
 *           type: string
 *           format: uri
 *           description: URL de la foto de perfil
 *         bio:
 *           type: string
 *           description: Biografía del usuario
 *           maxLength: 500
 *         isActive:
 *           type: boolean
 *           description: Estado de la cuenta
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Fecha de último login
 *       example:
 *         _id: "507f1f77bcf86cd799439011"
 *         username: "john_doe"
 *         email: "john@example.com"
 *         firstName: "John"
 *         lastName: "Doe"
 *         profilePicture: "https://example.com/profile.jpg"
 *         bio: "Desarrollador full-stack apasionado por la tecnología"
 *         isActive: true
 *         createdAt: "2024-01-15T10:30:00Z"
 *         updatedAt: "2024-01-15T10:30:00Z"
 */

module.exports = mongoose.model('User', userSchema);