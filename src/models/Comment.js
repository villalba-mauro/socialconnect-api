// src/models/Comment.js - Modelo para comentarios en posts
const mongoose = require('mongoose');

/**
 * Schema de Comentarios
 * Esta colección almacena los comentarios que los usuarios hacen en los posts
 */
const commentSchema = new mongoose.Schema({
  // Referencia al post donde se hizo el comentario
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',                        // Conecta con el modelo Post
    required: [true, 'El ID del post es obligatorio'],
    index: true                         // Índice para búsquedas rápidas
  },

  // Usuario que escribió el comentario
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',                        // Conecta con el modelo User
    required: [true, 'El ID del usuario es obligatorio'],
    index: true
  },

  // Contenido del comentario
  content: {
    type: String,
    required: [true, 'El contenido del comentario es obligatorio'],
    trim: true,
    maxlength: [500, 'El comentario no puede exceder 500 caracteres'],
    minlength: [1, 'El comentario no puede estar vacío']
  },

  // Comentario padre (para respuestas anidadas)
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',                     // Auto-referencia para comentarios anidados
    default: null
  },

  // Contador de likes en el comentario
  likesCount: {
    type: Number,
    default: 0,
    min: [0, 'Los likes no pueden ser negativos']
  },

  // Estado del comentario
  isActive: {
    type: Boolean,
    default: true
  },

  // Indica si fue editado
  isEdited: {
    type: Boolean,
    default: false
  },

  // Fecha de creación
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Fecha de última actualización
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,                     // Añade automáticamente createdAt y updatedAt
  toJSON: { virtuals: true },          // Incluir campos virtuales
  toObject: { virtuals: true }
});

/**
 * Campo virtual para obtener información del autor del comentario
 */
commentSchema.virtual('author', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

/**
 * Campo virtual para obtener información del post
 */
commentSchema.virtual('post', {
  ref: 'Post',
  localField: 'postId',
  foreignField: '_id',
  justOne: true
});

/**
 * Método estático para obtener comentarios de un post
 * @param {string} postId - ID del post
 * @param {Object} options - Opciones de paginación
 */
commentSchema.statics.getCommentsByPost = function(postId, options = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return this.find({ postId, isActive: true, parentCommentId: null })
    .populate('author', 'username firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
};

// Crear índices para mejorar rendimiento
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);