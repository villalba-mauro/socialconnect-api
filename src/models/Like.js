// src/models/Like.js - Modelo para sistema de likes
const mongoose = require('mongoose');

/**
 * Schema de Likes
 * Esta colección almacena todos los likes que los usuarios dan a posts y comentarios
 */
const likeSchema = new mongoose.Schema({
  // Usuario que dio el like
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es obligatorio'],
    index: true
  },

  // Tipo de contenido que recibió el like
  targetType: {
    type: String,
    enum: ['Post', 'Comment'],          // Solo puede ser Post o Comment
    required: [true, 'El tipo de objetivo es obligatorio']
  },

  // ID del post o comentario que recibió el like
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El ID del objetivo es obligatorio'],
    index: true
  },

  // Estado del like (permite soft delete)
  isActive: {
    type: Boolean,
    default: true
  },

  // Fecha cuando se dio el like
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Índice compuesto para evitar likes duplicados
 * Un usuario solo puede dar un like por post/comentario
 */
likeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

/**
 * Campo virtual para obtener información del usuario que dio el like
 */
likeSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

/**
 * Middleware pre-save para actualizar contadores
 * Se ejecuta antes de guardar un like nuevo
 */
likeSchema.pre('save', async function(next) {
  if (this.isNew && this.isActive) {
    // Incrementar contador en el post o comentario
    if (this.targetType === 'Post') {
      const Post = require('./Post');
      await Post.findByIdAndUpdate(this.targetId, { $inc: { likesCount: 1 } });
    } else if (this.targetType === 'Comment') {
      const Comment = require('./Comment');
      await Comment.findByIdAndUpdate(this.targetId, { $inc: { likesCount: 1 } });
    }
  }
  next();
});

/**
 * Método estático para obtener likes de un post
 * @param {string} postId - ID del post
 * @param {Object} options - Opciones de paginación
 */
likeSchema.statics.getLikesByPost = function(postId, options = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  return this.find({ targetType: 'Post', targetId: postId, isActive: true })
    .populate('user', 'username firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
};

/**
 * Método estático para verificar si un usuario dio like a un post/comentario
 * @param {string} userId - ID del usuario
 * @param {string} targetType - Tipo (Post o Comment)
 * @param {string} targetId - ID del objetivo
 */
likeSchema.statics.hasUserLiked = function(userId, targetType, targetId) {
  return this.findOne({
    userId,
    targetType,
    targetId,
    isActive: true
  });
};

/**
 * Método estático para toggle like (dar o quitar like)
 * @param {string} userId - ID del usuario
 * @param {string} targetType - Tipo (Post o Comment)
 * @param {string} targetId - ID del objetivo
 */
likeSchema.statics.toggleLike = async function(userId, targetType, targetId) {
  const existingLike = await this.findOne({ userId, targetType, targetId });

  if (existingLike) {
    // Si existe, toggle el estado
    existingLike.isActive = !existingLike.isActive;
    await existingLike.save();
    
    // Actualizar contador
    const increment = existingLike.isActive ? 1 : -1;
    if (targetType === 'Post') {
      const Post = require('./Post');
      await Post.findByIdAndUpdate(targetId, { $inc: { likesCount: increment } });
    } else if (targetType === 'Comment') {
      const Comment = require('./Comment');
      await Comment.findByIdAndUpdate(targetId, { $inc: { likesCount: increment } });
    }
    
    return existingLike;
  } else {
    // Si no existe, crear nuevo like
    return this.create({ userId, targetType, targetId });
  }
};

// Crear índices adicionales para mejorar rendimiento
likeSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
likeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Like', likeSchema);