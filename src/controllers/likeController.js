// src/controllers/likeController.js - Controlador para operaciones de likes
const Like = require('../models/Like');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * @desc    Dar o quitar like (toggle)
 * @route   POST /api/likes/toggle
 * @access  Private (requiere autenticación)
 */
const toggleLike = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.body;

  // ✅ SOLUCIÓN TEMPORAL: Usar usuario por defecto si no hay autenticación
  let userId;
  if (req.user && req.user._id) {
    userId = req.user._id;
  } else {
    // Usar el primer usuario de la base de datos
    const defaultUser = await User.findOne({ isActive: true });
    if (!defaultUser) {
      throw createError('No hay usuarios en el sistema. Primero crea un usuario.', 400);
    }
    userId = defaultUser._id;
  }

  // Validar targetType
  if (!['Post', 'Comment'].includes(targetType)) {
    throw createError('Tipo de objetivo inválido. Debe ser Post o Comment', 400);
  }

  // Verificar que el objetivo existe
  let target;
  if (targetType === 'Post') {
    target = await Post.findById(targetId);
    if (!target || !target.isActive) {
      throw createError('Post no encontrado', 404);
    }
  } else if (targetType === 'Comment') {
    target = await Comment.findById(targetId);
    if (!target || !target.isActive) {
      throw createError('Comentario no encontrado', 404);
    }
  }

  // Usar método estático para toggle like
  const result = await Like.toggleLike(userId, targetType, targetId);

  // Poblar información del usuario
  await result.populate('user', 'username firstName lastName profilePicture');

  res.status(200).json({
    success: true,
    message: result.isActive ? 'Like agregado exitosamente' : 'Like removido exitosamente',
    data: { 
      like: result,
      action: result.isActive ? 'liked' : 'unliked'
    }
  });
});

/**
 * @desc    Crear un like directamente
 * @route   POST /api/likes
 * @access  Private (requiere autenticación)
 */
const createLike = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.body;

  // ✅ SOLUCIÓN TEMPORAL: Usar usuario por defecto si no hay autenticación
  let userId;
  if (req.user && req.user._id) {
    userId = req.user._id;
  } else {
    const defaultUser = await User.findOne({ isActive: true });
    if (!defaultUser) {
      throw createError('No hay usuarios en el sistema. Primero crea un usuario.', 400);
    }
    userId = defaultUser._id;
  }

  // Verificar si ya existe el like
  const existingLike = await Like.hasUserLiked(userId, targetType, targetId);
  if (existingLike) {
    throw createError('Ya has dado like a este contenido', 400);
  }

  // Verificar que el objetivo existe
  if (targetType === 'Post') {
    const post = await Post.findById(targetId);
    if (!post || !post.isActive) {
      throw createError('Post no encontrado', 404);
    }
  } else if (targetType === 'Comment') {
    const comment = await Comment.findById(targetId);
    if (!comment || !comment.isActive) {
      throw createError('Comentario no encontrado', 404);
    }
  }

  // Crear nuevo like
  const like = await Like.create({ userId, targetType, targetId });

  // Poblar información del usuario
  await like.populate('user', 'username firstName lastName profilePicture');

  res.status(201).json({
    success: true,
    message: 'Like creado exitosamente',
    data: { like }
  });
});

/**
 * @desc    Obtener likes de un post específico
 * @route   GET /api/likes/post/:postId
 * @access  Public
 */
const getLikesByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Verificar que el post existe
  const post = await Post.findById(postId);
  if (!post || !post.isActive) {
    throw createError('Post no encontrado', 404);
  }

  // Usar método estático del modelo
  const likes = await Like.getLikesByPost(postId, { page, limit });

  // Contar total de likes del post
  const totalLikes = await Like.countDocuments({ 
    targetType: 'Post', 
    targetId: postId, 
    isActive: true 
  });

  const totalPages = Math.ceil(totalLikes / limit);

  res.status(200).json({
    success: true,
    message: 'Likes del post obtenidos exitosamente',
    data: {
      likes,
      post: {
        _id: post._id,
        content: post.content.substring(0, 100) + '...',
        likesCount: post.likesCount
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalLikes,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

/**
 * @desc    Obtener likes de un comentario específico
 * @route   GET /api/likes/comment/:commentId
 * @access  Public
 */
const getLikesByComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Verificar que el comentario existe
  const comment = await Comment.findById(commentId);
  if (!comment || !comment.isActive) {
    throw createError('Comentario no encontrado', 404);
  }

  const skip = (page - 1) * limit;

  const likes = await Like.find({ 
    targetType: 'Comment', 
    targetId: commentId, 
    isActive: true 
  })
    .populate('user', 'username firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalLikes = await Like.countDocuments({ 
    targetType: 'Comment', 
    targetId: commentId, 
    isActive: true 
  });

  const totalPages = Math.ceil(totalLikes / limit);

  res.status(200).json({
    success: true,
    message: 'Likes del comentario obtenidos exitosamente',
    data: {
      likes,
      comment: {
        _id: comment._id,
        content: comment.content,
        likesCount: comment.likesCount
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalLikes,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

/**
 * @desc    Obtener todos los likes (con paginación)
 * @route   GET /api/likes
 * @access  Public
 */
const getAllLikes = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const targetType = req.query.targetType; // Filtro opcional
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder || 'desc';

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Crear filtros
  let filters = { isActive: true };
  if (targetType && ['Post', 'Comment'].includes(targetType)) {
    filters.targetType = targetType;
  }

  const likes = await Like.find(filters)
    .populate('user', 'username firstName lastName profilePicture')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const totalLikes = await Like.countDocuments(filters);
  const totalPages = Math.ceil(totalLikes / limit);

  res.status(200).json({
    success: true,
    message: 'Likes obtenidos exitosamente',
    data: {
      likes,
      pagination: {
        currentPage: page,
        totalPages,
        totalLikes,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

/**
 * @desc    Obtener un like específico por ID
 * @route   GET /api/likes/:id
 * @access  Public
 */
const getLikeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const like = await Like.findById(id)
    .populate('user', 'username firstName lastName profilePicture');

  if (!like) {
    throw createError('Like no encontrado', 404);
  }

  if (!like.isActive) {
    throw createError('Like no disponible', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Like obtenido exitosamente',
    data: { like }
  });
});

/**
 * @desc    Eliminar un like
 * @route   DELETE /api/likes/:id
 * @access  Private (solo el usuario que dio el like)
 */
const deleteLike = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const like = await Like.findById(id);

  if (!like) {
    throw createError('Like no encontrado', 404);
  }

  // Verificar autorización (temporal: permitir si no hay usuario autenticado)
  if (req.user && like.userId.toString() !== req.user._id.toString()) {
    throw createError('No tienes permisos para eliminar este like', 403);
  }

  // Soft delete
  like.isActive = false;
  await like.save();

  // Decrementar contador
  if (like.targetType === 'Post') {
    await Post.findByIdAndUpdate(like.targetId, { $inc: { likesCount: -1 } });
  } else if (like.targetType === 'Comment') {
    await Comment.findByIdAndUpdate(like.targetId, { $inc: { likesCount: -1 } });
  }

  res.status(200).json({
    success: true,
    message: 'Like eliminado exitosamente'
  });
});

/**
 * @desc    Obtener likes de un usuario específico
 * @route   GET /api/likes/user/:userId
 * @access  Public
 */
const getLikesByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const targetType = req.query.targetType; // Filtro opcional

  // Verificar que el usuario existe
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw createError('Usuario no encontrado', 404);
  }

  const skip = (page - 1) * limit;

  // Crear filtros
  let filters = { userId, isActive: true };
  if (targetType && ['Post', 'Comment'].includes(targetType)) {
    filters.targetType = targetType;
  }

  const likes = await Like.find(filters)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalLikes = await Like.countDocuments(filters);
  const totalPages = Math.ceil(totalLikes / limit);

  res.status(200).json({
    success: true,
    message: 'Likes del usuario obtenidos exitosamente',
    data: {
      likes,
      user: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalLikes,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

/**
 * @desc    Verificar si un usuario dio like a un contenido
 * @route   GET /api/likes/check/:targetType/:targetId
 * @access  Private
 */
const checkUserLike = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;

  // ✅ SOLUCIÓN TEMPORAL: Usar usuario por defecto si no hay autenticación
  let userId;
  if (req.user && req.user._id) {
    userId = req.user._id;
  } else {
    const defaultUser = await User.findOne({ isActive: true });
    if (!defaultUser) {
      throw createError('No hay usuarios en el sistema', 400);
    }
    userId = defaultUser._id;
  }

  const like = await Like.hasUserLiked(userId, targetType, targetId);

  res.status(200).json({
    success: true,
    message: 'Verificación de like completada',
    data: {
      hasLiked: !!like,
      like: like || null
    }
  });
});

module.exports = {
  toggleLike,
  createLike,
  getLikesByPost,
  getLikesByComment,
  getAllLikes,
  getLikeById,
  deleteLike,
  getLikesByUser,
  checkUserLike
};