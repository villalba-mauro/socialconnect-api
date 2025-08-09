// src/routes/commentRoutes.js - Rutas para operaciones de comentarios
const express = require('express');
const router = express.Router();

// Importar controladores
const {
  createComment,
  getCommentsByPost,
  getCommentById,
  getAllComments,
  updateComment,
  deleteComment,
  getCommentsByUser
} = require('../controllers/commentController');

// Importar validadores
const {
  validateCreateComment,
  validateUpdateComment,
  validateCommentId,
  validatePostId,
  validateUserId,
  validateQueryParams
} = require('../validators/commentValidators');

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Operaciones relacionadas con comentarios
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - postId
 *         - userId
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único del comentario
 *         postId:
 *           type: string
 *           description: ID del post comentado
 *         userId:
 *           type: string
 *           description: ID del usuario que comentó
 *         content:
 *           type: string
 *           description: Contenido del comentario
 *           maxLength: 500
 *         parentCommentId:
 *           type: string
 *           description: ID del comentario padre (para respuestas)
 *           nullable: true
 *         likesCount:
 *           type: integer
 *           description: Número de likes del comentario
 *           minimum: 0
 *           default: 0
 *         isActive:
 *           type: boolean
 *           description: Estado del comentario
 *           default: true
 *         isEdited:
 *           type: boolean
 *           description: Si el comentario fue editado
 *           default: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de última actualización
 */

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Crear un nuevo comentario
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *               - content
 *             properties:
 *               postId:
 *                 type: string
 *                 description: ID del post a comentar
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: Contenido del comentario
 *               parentCommentId:
 *                 type: string
 *                 description: ID del comentario padre (para respuestas)
 *                 nullable: true
 *             example:
 *               postId: "507f1f77bcf86cd799439011"
 *               content: "¡Excelente post! Me encanta el contenido."
 *               parentCommentId: null
 *     responses:
 *       201:
 *         description: Comentario creado exitosamente
 *       400:
 *         description: Error de validación
 *       404:
 *         description: Post no encontrado
 */
router.post('/', validateCreateComment, createComment);

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Obtener todos los comentarios
 *     tags: [Comments]
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
 *         description: Comentarios por página
 *     responses:
 *       200:
 *         description: Lista de comentarios obtenida exitosamente
 */
router.get('/', validateQueryParams, getAllComments);

/**
 * @swagger
 * /api/comments/post/{postId}:
 *   get:
 *     summary: Obtener comentarios de un post específico
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del post
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Comentarios del post obtenidos exitosamente
 *       404:
 *         description: Post no encontrado
 */
router.get('/post/:postId', validatePostId, validateQueryParams, getCommentsByPost);

/**
 * @swagger
 * /api/comments/user/{userId}:
 *   get:
 *     summary: Obtener comentarios de un usuario específico
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Comentarios del usuario obtenidos exitosamente
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/user/:userId', validateUserId, validateQueryParams, getCommentsByUser);

/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     summary: Obtener comentario por ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del comentario
 *     responses:
 *       200:
 *         description: Comentario obtenido exitosamente
 *       404:
 *         description: Comentario no encontrado
 */
router.get('/:id', validateCommentId, getCommentById);

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Actualizar comentario
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del comentario
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
 *                 maxLength: 500
 *                 description: Nuevo contenido del comentario
 *             example:
 *               content: "Comentario actualizado con nueva información."
 *     responses:
 *       200:
 *         description: Comentario actualizado exitosamente
 *       400:
 *         description: Error de validación
 *       403:
 *         description: No tienes permisos para actualizar este comentario
 *       404:
 *         description: Comentario no encontrado
 */
router.put('/:id', validateCommentId, validateUpdateComment, updateComment);

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Eliminar comentario
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del comentario
 *     responses:
 *       200:
 *         description: Comentario eliminado exitosamente
 *       403:
 *         description: No tienes permisos para eliminar este comentario
 *       404:
 *         description: Comentario no encontrado
 */
router.delete('/:id', validateCommentId, deleteComment);

module.exports = router;