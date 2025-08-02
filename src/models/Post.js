// src/models/Post.js - Modelo de Post para MongoDB
const mongoose = require('mongoose');

/**
 * Schema del Post
 * Define la estructura de los documentos de post en MongoDB
 */
const postSchema = new mongoose.Schema({
  // Referencia al usuario que creó el post
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',                        // Hace referencia al modelo User
    required: [true, 'El ID del usuario es obligatorio'],
    index: true                         // Crear índice para consultas más rápidas
  },

  // Contenido del post
  content: {
    type: String,
    required: [true, 'El contenido del post es obligatorio'],
    trim: true,
    maxlength: [2000, 'El contenido no puede exceder 2000 caracteres'],
    minlength: [1, 'El contenido no puede estar vacío']
  },

  // URL de imagen del post (opcional)
  imageUrl: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        // Si hay valor, debe ser una URL válida de imagen
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'La URL de la imagen debe ser válida y terminar en jpg, jpeg, png, gif o webp'
    }
  },

  // Contador de likes (se actualiza cuando se dan likes)
  likesCount: {
    type: Number,
    default: 0,
    min: [0, 'El contador de likes no puede ser negativo']
  },

  // Contador de comentarios (se actualiza cuando se agregan comentarios)
  commentsCount: {
    type: Number,
    default: 0,
    min: [0, 'El contador de comentarios no puede ser negativo']
  },

  // Estado del post
  isActive: {
    type: Boolean,
    default: true
  },

  // Tipo de contenido del post
  contentType: {
    type: String,
    enum: ['text', 'image', 'text_image'],
    default: function() {
      // Determinar tipo basado en si hay imagen o no
      if (this.imageUrl && this.content) return 'text_image';
      if (this.imageUrl) return 'image';
      return 'text';
    }
  },

  // Etiquetas/hashtags del post
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Cada etiqueta no puede exceder 50 caracteres']
  }],

  // Fecha de creación
  createdAt: {
    type: Date,
    default: Date.now,
    index: true                         // Índice para ordenar por fecha
  },

  // Fecha de última actualización
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Opciones del schema
  timestamps: true,                     // Añade automáticamente createdAt y updatedAt
  toJSON: { virtuals: true },          // Incluir campos virtuales al convertir a JSON
  toObject: { virtuals: true }
});

/**
 * Campo virtual para obtener información del autor del post
 * No se almacena en la base de datos, se calcula dinámicamente
 */
postSchema.virtual('author', {
  ref: 'User',                         // Modelo al que hace referencia
  localField: 'userId',                // Campo local que contiene la referencia
  foreignField: '_id',                 // Campo en el modelo referenciado
  justOne: true                        // Solo devolver un documento
});

/**
 * Middleware pre-save
 * Se ejecuta antes de guardar un documento
 */
postSchema.pre('save', function(next) {
  // Actualizar fecha de modificación
  this.updatedAt = Date.now();
  
  // Determinar tipo de contenido automáticamente
  if (this.imageUrl && this.content) {
    this.contentType = 'text_image';
  } else if (this.imageUrl) {
    this.contentType = 'image';
  } else {
    this.contentType = 'text';
  }
  
  next();
});

/**
 * Middleware post-save
 * Se ejecuta después de guardar un documento
 */
postSchema.post('save', function(doc) {
  console.log(`✅ Post guardado: ${doc._id}`);
});

/**
 * Método de instancia para incrementar likes
 * @returns {Promise} - Promesa que resuelve el documento actualizado
 */
postSchema.methods.incrementLikes = function() {
  this.likesCount += 1;
  return this.save();
};

/**
 * Método de instancia para decrementar likes
 * @returns {Promise} - Promesa que resuelve el documento actualizado
 */
postSchema.methods.decrementLikes = function() {
  if (this.likesCount > 0) {
    this.likesCount -= 1;
  }
  return this.save();
};

/**
 * Método de instancia para incrementar comentarios
 * @returns {Promise} - Promesa que resuelve el documento actualizado
 */
postSchema.methods.incrementComments = function() {
  this.commentsCount += 1;
  return this.save();
};

/**
 * Método de instancia para decrementar comentarios
 * @returns {Promise} - Promesa que resuelve el documento actualizado
 */
postSchema.methods.decrementComments = function() {
  if (this.commentsCount > 0) {
    this.commentsCount -= 1;
  }
  return this.save();
};

/**
 * Método estático para obtener posts de un usuario
 * @param {string} userId - ID del usuario
 * @param {Object} options - Opciones de paginación
 * @returns {Promise} - Promesa que resuelve los posts del usuario
 */
postSchema.statics.getPostsByUser = function(userId, options = {}) {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const skip = (page - 1) * limit;

  return this.find({ userId, isActive: true })
    .populate('author', 'username firstName lastName profilePicture')
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip(skip)
    .limit(parseInt(limit));
};

/**
 * Método estático para obtener posts recientes
 * @param {Object} options - Opciones de paginación
 * @returns {Promise} - Promesa que resuelve los posts recientes
 */
postSchema.statics.getRecentPosts = function(options = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return this.find({ isActive: true })
    .populate('author', 'username firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
};

// Crear índices para mejorar el rendimiento
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ likesCount: -1 });

/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       required:
 *         - userId
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del post
 *         userId:
 *           type: string
 *           description: ID del usuario que creó el post
 *         content:
 *           type: string
 *           description: Contenido del post
 *           maxLength: 2000
 *           minLength: 1
 *         imageUrl:
 *           type: string
 *           format: uri
 *           description: URL de la imagen del post
 *         likesCount:
 *           type: integer
 *           description: Número de likes del post
 *           minimum: 0
 *           default: 0
 *         commentsCount:
 *           type: integer
 *           description: Número de comentarios del post
 *           minimum: 0
 *           default: 0
 *         isActive:
 *           type: boolean
 *           description: Estado del post
 *           default: true
 *         contentType:
 *           type: string
 *           enum: [text, image, text_image]
 *           description: Tipo de contenido del post
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Etiquetas del post
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 *       example:
 *         _id: "507f1f77bcf86cd799439011"
 *         userId: "507f1f77bcf86cd799439012"
 *         content: "¡Hola mundo! Este es mi primer post en SocialConnect"
 *         imageUrl: "https://example.com/image.jpg"
 *         likesCount: 15
 *         commentsCount: 3
 *         isActive: true
 *         contentType: "text_image"
 *         tags: ["hola", "primer-post", "socialconnect"]
 *         createdAt: "2024-01-15T10:30:00Z"
 *         updatedAt: "2024-01-15T10:30:00Z"
 */

module.exports = mongoose.model('Post', postSchema);