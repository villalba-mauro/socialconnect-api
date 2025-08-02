// src/controllers/postController.js - Controlador para operaciones de posts
const Post = require('../models/Post');
const User = require('../models/User');
const { asyncHandler, createError } = require('../middleware/errorHandler');

/**
 * @desc    Crear un nuevo post
 * @route   POST /api/posts
 * @access  Private (requiere autenticación)
 * 
 * Esta función crea un nuevo post asociado al usuario autenticado
 */
const createPost = asyncHandler(async (req, res) => {
  // Extraer datos del cuerpo de la petición
  const { content, imageUrl, tags } = req.body;

  // ✅ SOLUCIÓN TEMPORAL W05: Usar usuario por defecto si no hay autenticación
  let userId;
  
  if (req.user && req.user._id) {
    // Si hay usuario autenticado, usar su ID
    userId = req.user._id;
  } else {
    // ✅ TEMPORAL: Usar el primer usuario de la base de datos
    const User = require('../models/User');
    const defaultUser = await User.findOne({ isActive: true });
    
    if (!defaultUser) {
      // Si no hay usuarios, crear un error amigable
      throw createError('No hay usuarios en el sistema. Primero crea un usuario.', 400);
    }
    
    userId = defaultUser._id;
  }

  // Crear nuevo post con el ID del usuario (autenticado o por defecto)
  const post = await Post.create({
    userId: userId,
    content,
    imageUrl,
    tags: tags || []
  });

  // Poblar la información del autor para incluirla en la respuesta
  await post.populate('author', 'username firstName lastName profilePicture');

  // Enviar respuesta exitosa con el post creado
  res.status(201).json({
    success: true,
    message: 'Post creado exitosamente',
    data: { post }
  });
});

/**
 * @desc    Obtener todos los posts (feed público)
 * @route   GET /api/posts
 * @access  Public (pero puede mostrar contenido diferente si está autenticado)
 * 
 * Esta función devuelve una lista paginada de posts públicos
 * con opciones de filtrado y ordenamiento
 */
const getAllPosts = asyncHandler(async (req, res) => {
  // Extraer parámetros de consulta con valores por defecto
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder || 'desc';
  const tags = req.query.tags;                          // Filtro por etiquetas

  // Calcular el offset para la paginación
  const skip = (page - 1) * limit;

  // Crear objeto de filtros (solo posts activos)
  let filters = { isActive: true };

  // Si se proporcionan etiquetas para filtrar
  if (tags) {
    let tagFilters;
    if (Array.isArray(tags)) {
      // Si tags es un array, buscar posts que contengan cualquiera de esas etiquetas
      tagFilters = { $in: tags };
    } else {
      // Si tags es un string, buscar posts que contengan esa etiqueta
      tagFilters = tags;
    }
    filters.tags = tagFilters;
  }

  // Crear objeto de ordenamiento
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Ejecutar consulta con paginación, ordenamiento y población de autor
  const posts = await Post.find(filters)
    .populate('author', 'username firstName lastName profilePicture')  // Incluir info del autor
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // Contar total de posts que coinciden con los filtros
  const totalPosts = await Post.countDocuments(filters);

  // Calcular información de paginación
  const totalPages = Math.ceil(totalPosts / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Enviar respuesta con posts y metadatos
  res.status(200).json({
    success: true,
    message: 'Posts obtenidos exitosamente',
    data: {
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage,
        hasPrevPage,
        limit
      }
    }
  });
});

/**
 * @desc    Obtener un post específico por ID
 * @route   GET /api/posts/:id
 * @access  Public
 * 
 * Esta función busca y devuelve un post específico por su ID
 */
const getPostById = asyncHandler(async (req, res) => {
  // Obtener ID del post desde los parámetros de la URL
  const { id } = req.params;

  // Buscar el post por ID e incluir información del autor
  const post = await Post.findById(id)
    .populate('author', 'username firstName lastName profilePicture bio');

  // Verificar si el post existe
  if (!post) {
    throw createError('Post no encontrado', 404);
  }

  // Verificar si el post está activo
  if (!post.isActive) {
    throw createError('Post no disponible', 404);
  }

  // Enviar respuesta exitosa con el post
  res.status(200).json({
    success: true,
    message: 'Post obtenido exitosamente',
    data: { post }
  });
});

/**
 * @desc    Obtener posts de un usuario específico
 * @route   GET /api/posts/user/:userId
 * @access  Public
 * 
 * Esta función devuelve todos los posts de un usuario específico
 */
const getPostsByUser = asyncHandler(async (req, res) => {
  // Obtener ID del usuario desde los parámetros
  const { userId } = req.params;

  // Verificar que el usuario existe
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw createError('Usuario no encontrado', 404);
  }

  // Extraer parámetros de paginación
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder || 'desc';

  // Usar el método estático del modelo para obtener posts del usuario
  const posts = await Post.getPostsByUser(userId, {
    page,
    limit,
    sortBy,
    sortOrder
  });

  // Contar total de posts del usuario
  const totalPosts = await Post.countDocuments({ 
    userId, 
    isActive: true 
  });

  // Calcular información de paginación
  const totalPages = Math.ceil(totalPosts / limit);

  // Enviar respuesta con los posts del usuario
  res.status(200).json({
    success: true,
    message: `Posts del usuario obtenidos exitosamente`,
    data: {
      posts,
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
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

/**
 * @desc    Actualizar un post
 * @route   PUT /api/posts/:id
 * @access  Private (solo el autor puede actualizar)
 * 
 * Esta función actualiza un post existente
 */
const updatePost = asyncHandler(async (req, res) => {
  // Obtener ID del post desde los parámetros
  const { id } = req.params;

  // Buscar el post
  const post = await Post.findById(id);

  // Verificar si el post existe
  if (!post) {
    throw createError('Post no encontrado', 404);
  }

  // Verificar que el usuario autenticado sea el autor del post
  if (post.userId.toString() !== req.user._id.toString()) {
    throw createError('No tienes permisos para actualizar este post', 403);
  }

  // Extraer campos actualizables del cuerpo de la petición
  const updateFields = {};
  const allowedFields = ['content', 'imageUrl', 'tags'];

  // Solo incluir campos que están en la petición y son permitidos
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateFields[field] = req.body[field];
    }
  });

  // Verificar que hay al menos un campo para actualizar
  if (Object.keys(updateFields).length === 0) {
    throw createError('Debe proporcionar al menos un campo para actualizar', 400);
  }

  // Actualizar el post
  Object.assign(post, updateFields);
  await post.save();

  // Poblar información del autor para la respuesta
  await post.populate('author', 'username firstName lastName profilePicture');

  // Enviar respuesta exitosa con el post actualizado
  res.status(200).json({
    success: true,
    message: 'Post actualizado exitosamente',
    data: { post }
  });
});

/**
 * @desc    Eliminar (desactivar) un post
 * @route   DELETE /api/posts/:id
 * @access  Private (solo el autor puede eliminar)
 * 
 * Esta función "elimina" un post marcándolo como inactivo
 */
const deletePost = asyncHandler(async (req, res) => {
  // Obtener ID del post desde los parámetros
  const { id } = req.params;

  // Buscar el post
  const post = await Post.findById(id);

  // Verificar si el post existe
  if (!post) {
    throw createError('Post no encontrado', 404);
  }

  // Verificar que el usuario autenticado sea el autor del post
  if (post.userId.toString() !== req.user._id.toString()) {
    throw createError('No tienes permisos para eliminar este post', 403);
  }

  // Marcar como inactivo en lugar de eliminar físicamente
  post.isActive = false;
  await post.save();

  // Enviar respuesta exitosa
  res.status(200).json({
    success: true,
    message: 'Post eliminado exitosamente'
  });
});

/**
 * @desc    Obtener posts recientes (feed principal)
 * @route   GET /api/posts/feed/recent
 * @access  Public
 * 
 * Esta función devuelve los posts más recientes para el feed principal
 */
const getRecentPosts = asyncHandler(async (req, res) => {
  // Extraer parámetros de paginación
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;        // Más posts para el feed principal

  // Usar el método estático del modelo
  const posts = await Post.getRecentPosts({ page, limit });

  // Contar total de posts activos
  const totalPosts = await Post.countDocuments({ isActive: true });

  // Calcular información de paginación
  const totalPages = Math.ceil(totalPosts / limit);

  // Enviar respuesta con los posts recientes
  res.status(200).json({
    success: true,
    message: 'Posts recientes obtenidos exitosamente',
    data: {
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

/**
 * @desc    Buscar posts por contenido
 * @route   GET /api/posts/search
 * @access  Public
 * 
 * Esta función busca posts que contengan un término específico
 */
const searchPosts = asyncHandler(async (req, res) => {
  // Obtener término de búsqueda
  const { q: searchTerm } = req.query;

  // Verificar que se proporcionó un término de búsqueda
  if (!searchTerm || searchTerm.trim().length === 0) {
    throw createError('Debe proporcionar un término de búsqueda', 400);
  }

  // Parámetros de paginación
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Crear filtros de búsqueda
  const searchFilters = {
    isActive: true,
    $or: [
      { content: { $regex: searchTerm, $options: 'i' } },     // Buscar en contenido
      { tags: { $regex: searchTerm, $options: 'i' } }         // Buscar en etiquetas
    ]
  };

  // Ejecutar búsqueda
  const posts = await Post.find(searchFilters)
    .populate('author', 'username firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Contar resultados
  const totalPosts = await Post.countDocuments(searchFilters);
  const totalPages = Math.ceil(totalPosts / limit);

  // Enviar respuesta con resultados de búsqueda
  res.status(200).json({
    success: true,
    message: `Se encontraron ${totalPosts} posts`,
    data: {
      posts,
      searchTerm,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
      }
    }
  });
});

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  getPostsByUser,
  updatePost,
  deletePost,
  getRecentPosts,
  searchPosts
};