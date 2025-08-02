// src/routes/postRoutes.js - Definición de rutas para operaciones de posts
const express = require('express');
const router = express.Router();

// Importar controladores
const {
  createPost,
  getAllPosts,
  getPostById,
  getPostsByUser,
  updatePost,
  deletePost,
  getRecentPosts,
  searchPosts
} = require('../controllers/postController');

// Importar middleware de autenticación
const { authenticate, optionalAuth } = require('../middleware/auth');

// Importar validadores
const {
  validateCreatePost,
  validateUpdatePost,
  validatePostId,
  validateUserIdParam,
  validateQueryParams
} = require('../validators/postValidators');

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Operaciones relacionadas con posts
 */

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Crear un nuevo post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 example: "¡Hola mundo! Este es mi primer post en SocialConnect 🚀"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 pattern: "\\.(jpg|jpeg|png|gif|webp)$"
 *                 example: "https://example.com/imagen.jpg"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                   pattern: "^[a-zA-Z0-9\\-_]+$"
 *                 maxItems: 10
 *                 example: ["hola-mundo", "primer-post", "socialconnect"]
 *     responses:
 *       201:
 *         description: Post creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post creado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     post:
 *                       $ref: '#/components/schemas/Post'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Errores de validación"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Token de autorización inválido"
 */
// Esta ruta maneja POST /api/posts para crear nuevos posts
// Requiere autenticación y validación del contenido
router.post('/', authenticate, validateCreatePost, createPost);

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Obtener lista de posts (feed público)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Número de posts por página
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, likesCount, commentsCount]
 *           default: createdAt
 *         description: Campo por el cual ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de clasificación
 *       - in: query
 *         name: tags
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         description: Filtrar por etiquetas específicas
 *         example: "tecnologia"
 *     responses:
 *       200:
 *         description: Lista de posts obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Posts obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalPosts:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                         limit:
 *                           type: integer
 */
// Esta ruta maneja GET /api/posts para obtener lista de posts
// Es pública pero puede usar autenticación opcional para contenido personalizado
router.get('/', validateQueryParams, optionalAuth, getAllPosts);

/**
 * @swagger
 * /api/posts/feed/recent:
 *   get:
 *     summary: Obtener posts recientes (feed principal)
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Número de posts por página
 *     responses:
 *       200:
 *         description: Posts recientes obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Posts recientes obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalPosts:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                         limit:
 *                           type: integer
 */
// Esta ruta maneja GET /api/posts/feed/recent para obtener posts recientes
router.get('/feed/recent', validateQueryParams, getRecentPosts);

/**
 * @swagger
 * /api/posts/search:
 *   get:
 *     summary: Buscar posts por contenido
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Término de búsqueda
 *         example: "javascript"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Número de posts por página
 *     responses:
 *       200:
 *         description: Resultados de búsqueda obtenidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Se encontraron 15 posts"
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                     searchTerm:
 *                       type: string
 *                       example: "javascript"
 *                     pagination:
 *                       type: object
 *       400:
 *         description: Término de búsqueda requerido
 */
// Esta ruta maneja GET /api/posts/search para buscar posts
router.get('/search', validateQueryParams, searchPosts);

/**
 * @swagger
 * /api/posts/user/{userId}:
 *   get:
 *     summary: Obtener posts de un usuario específico
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del usuario
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Número de posts por página
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, likesCount, commentsCount]
 *           default: createdAt
 *         description: Campo por el cual ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Orden de clasificación
 *     responses:
 *       200:
 *         description: Posts del usuario obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Posts del usuario obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Post'
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         profilePicture:
 *                           type: string
 *                     pagination:
 *                       type: object
 *       404:
 *         description: Usuario no encontrado
 */
// Esta ruta maneja GET /api/posts/user/:userId para obtener posts de un usuario
router.get('/user/:userId', validateUserIdParam, validateQueryParams, getPostsByUser);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Obtener post por ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del post
 *     responses:
 *       200:
 *         description: Post obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post obtenido exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     post:
 *                       $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Post no encontrado"
 */
// Esta ruta maneja GET /api/posts/:id para obtener un post específico
router.get('/:id', validatePostId, getPostById);

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Actualizar post (solo el autor)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del post
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 example: "Contenido actualizado del post"
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: "https://example.com/nueva-imagen.jpg"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 maxItems: 10
 *                 example: ["actualizado", "nuevo-contenido"]
 *     responses:
 *       200:
 *         description: Post actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post actualizado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     post:
 *                       $ref: '#/components/schemas/Post'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tienes permisos para actualizar este post
 *       404:
 *         description: Post no encontrado
 */
// Esta ruta maneja PUT /api/posts/:id para actualizar un post
// Requiere autenticación y que el usuario sea el autor del post
router.put('/:id', authenticate, validatePostId, validateUpdatePost, updatePost);

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Eliminar post (solo el autor)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del post
 *     responses:
 *       200:
 *         description: Post eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post eliminado exitosamente"
 *       401:
 *         description: No autorizado
 *       403:
 *         description: No tienes permisos para eliminar este post
 *       404:
 *         description: Post no encontrado
 */
// Esta ruta maneja DELETE /api/posts/:id para eliminar (desactivar) un post
router.delete('/:id', authenticate, validatePostId, deletePost);

module.exports = router;