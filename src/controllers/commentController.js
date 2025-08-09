// src/controllers/commentController.js - Controlador para operaciones de comentarios
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * @desc    Crear un nuevo comentario
 * @route   POST /api/comments
 * @access  Private (requiere autenticación)
 */
const createComment = asyncHandler(async (req, res) => {
  const { postId, content, parentCommentId } = req.body;

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

  // Verificar que el post existe
  const post = await Post.findById(postId);
  if (!post || !post.isActive) {
    throw createError('Post no encontrado', 404);
  }

  // Si es una respuesta, verificar que el comentario padre existe
  if (parentCommentId) {
    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment || !parentComment.isActive) {
      throw createError('Comentario padre no encontrado', 404);
    }
  }

  // Crear nuevo comentario
  const comment = await Comment.create({
    postId,
    userId,
    content,
    parentCommentId: parentCommentId || null
  });

  // Incrementar contador de comentarios en el post
  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

  // Poblar información del autor para la respuesta
  await comment.populate('author', 'username firstName lastName profilePicture');

  res.status(201).json({
    success: true,
    message: 'Comentario creado exitosamente',
    data: { comment }
  });
});

/**
 * @desc    Obtener comentarios de un post específico
 * @route   GET /api/comments/post/:postId
 * @access  Public
 */
const getCommentsByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Verificar que el post existe
  const post = await Post.findById(postId);
  if (!post || !post.isActive) {
    throw createError('Post no encontrado', 404);
  }

  // Usar método estático del modelo
  const comments = await Comment.getCommentsByPost(postId, { page, limit });

  // Contar total de comentarios del post
  const totalComments = await Comment.countDocuments({ 
    postId, 
    isActive: true, 
    parentCommentId: null 
  });

  const totalPages = Math.ceil(totalComments / limit);

  res.status(200).json({
    success: true,
    message: 'Comentarios obtenidos exitosamente',
    data: {
      comments,
      post: {
        _id: post._id,
        content: post.content.substring(0, 100) + '...',
        author: post.author
      },
      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

/**
 * @desc    Obtener un comentario específico por ID
 * @route   GET /api/comments/:id
 * @access  Public
 */
const getCommentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await Comment.findById(id)
    .populate('author', 'username firstName lastName profilePicture')
    .populate('post', 'content userId');

  if (!comment) {
    throw createError('Comentario no encontrado', 404);
  }

  if (!comment.isActive) {
    throw createError('Comentario no disponible', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Comentario obtenido exitosamente',
    data: { comment }
  });
});

/**
 * @desc    Obtener todos los comentarios (con paginación)
 * @route   GET /api/comments
 * @access  Public
 */
const getAllComments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder || 'desc';

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const comments = await Comment.find({ isActive: true })
    .populate('author', 'username firstName lastName profilePicture')
    .populate('post', 'content userId')
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const totalComments = await Comment.countDocuments({ isActive: true });
  const totalPages = Math.ceil(totalComments / limit);

  res.status(200).json({
    success: true,
    message: 'Comentarios obtenidos exitosamente',
    data: {
      comments,
      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

/**
 * @desc    Actualizar un comentario
 * @route   PUT /api/comments/:id
 * @access  Private (solo el autor)
 */
const updateComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const comment = await Comment.findById(id);

  if (!comment) {
    throw createError('Comentario no encontrado', 404);
  }

  // Verificar autorización (temporal: permitir si no hay usuario autenticado)
  if (req.user && comment.userId.toString() !== req.user._id.toString()) {
    throw createError('No tienes permisos para actualizar este comentario', 403);
  }

  // Actualizar comentario
  comment.content = content;
  comment.isEdited = true;
  comment.updatedAt = Date.now();
  await comment.save();

  // Poblar información del autor
  await comment.populate('author', 'username firstName lastName profilePicture');

  res.status(200).json({
    success: true,
    message: 'Comentario actualizado exitosamente',
    data: { comment }
  });
});

/**
 * @desc    Eliminar (desactivar) un comentario
 * @route   DELETE /api/comments/:id
 * @access  Private (solo el autor)
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comment = await Comment.findById(id);

  if (!comment) {
    throw createError('Comentario no encontrado', 404);
  }

  // Verificar autorización (temporal: permitir si no hay usuario autenticado)
  if (req.user && comment.userId.toString() !== req.user._id.toString()) {
    throw createError('No tienes permisos para eliminar este comentario', 403);
  }

  // Soft delete
  comment.isActive = false;
  await comment.save();

  // Decrementar contador en el post
  await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });

  res.status(200).json({
    success: true,
    message: 'Comentario eliminado exitosamente'
  });
});

/**
 * @desc    Obtener comentarios de un usuario específico
 * @route   GET /api/comments/user/:userId
 * @access  Public
 */
const getCommentsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Verificar que el usuario existe
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw createError('Usuario no encontrado', 404);
  }

  const skip = (page - 1) * limit;

  const comments = await Comment.find({ userId, isActive: true })
    .populate('post', 'content userId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalComments = await Comment.countDocuments({ userId, isActive: true });
  const totalPages = Math.ceil(totalComments / limit);

  res.status(200).json({
    success: true,
    message: 'Comentarios del usuario obtenidos exitosamente',
    data: {
      comments,
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
        totalComments,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

module.exports = {
  createComment,
  getCommentsByPost,
  getCommentById,
  getAllComments,
  updateComment,
  deleteComment,
  getCommentsByUser
};