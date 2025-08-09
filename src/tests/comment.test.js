// src/tests/comment.test.js - Tests unitarios completos para comentarios (4+ tests)
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

/**
 * Configuración de la base de datos de pruebas
 */
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/socialconnect_test';

// Datos de prueba reutilizables
const testUser1 = {
  username: 'commenter1',
  email: 'commenter1@example.com',
  password: 'Password123',
  firstName: 'Comment',
  lastName: 'User1',
  bio: 'Usuario de prueba para comentarios'
};

const testUser2 = {
  username: 'commenter2',
  email: 'commenter2@example.com',
  password: 'Password123',
  firstName: 'Comment',
  lastName: 'User2',
  bio: 'Segundo usuario de prueba'
};

// Variables para almacenar datos creados durante los tests
let createdUser1;
let createdUser2;
let testPost1;
let testPost2;
let testComment1;
let testComment2;
let testComment3;

/**
 * Setup y teardown de la suite de tests
 */
beforeAll(async () => {
  // Conectar a la base de datos de pruebas
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('🧪 Conectado a base de datos de pruebas para comentarios');
});

beforeEach(async () => {
  // Limpiar base de datos antes de cada test
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  
  // Crear usuarios de prueba
  createdUser1 = await User.create(testUser1);
  createdUser2 = await User.create(testUser2);
  
  // Crear posts de prueba
  testPost1 = await Post.create({
    userId: createdUser1._id,
    content: 'Post de prueba para comentarios número 1',
    tags: ['test', 'comments']
  });
  
  testPost2 = await Post.create({
    userId: createdUser2._id,
    content: 'Segundo post de prueba para comentarios',
    tags: ['test', 'segunda-prueba']
  });
  
  // Crear comentarios de prueba
  testComment1 = await Comment.create({
    postId: testPost1._id,
    userId: createdUser1._id,
    content: 'Este es el primer comentario de prueba'
  });
  
  testComment2 = await Comment.create({
    postId: testPost1._id,
    userId: createdUser2._id,
    content: 'Segundo comentario en el mismo post'
  });
  
  testComment3 = await Comment.create({
    postId: testPost2._id,
    userId: createdUser1._id,
    content: 'Comentario en el segundo post'
  });
});

afterEach(async () => {
  // Limpiar base de datos después de cada test
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
});

afterAll(async () => {
  // Cerrar conexión después de todos los tests
  await mongoose.connection.close();
  console.log('🔌 Conexión a base de datos de pruebas cerrada');
});

/**
 * Suite de tests para endpoints GET de comentarios
 */
describe('Comment GET Endpoints Tests', () => {
  
  /**
   * TEST 1: GET /api/comments - Obtener lista de comentarios
   */
  describe('GET /api/comments - Lista de comentarios', () => {
    
    test('Debería obtener lista de comentarios exitosamente', async () => {
      const response = await request(app)
        .get('/api/comments')
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('comments');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHavePaginationStructure();

      // Verificar que devuelve los comentarios creados
      expect(response.body.data.comments).toHaveLength(3);
      
      // Verificar estructura de cada comentario
      response.body.data.comments.forEach(comment => {
        expect(comment).toHaveProperty('_id');
        expect(comment).toHaveProperty('postId');
        expect(comment).toHaveProperty('userId');
        expect(comment).toHaveProperty('content');
        expect(comment).toHaveProperty('author');
        expect(comment).toHaveProperty('post');
        expect(comment).toHaveProperty('likesCount');
        expect(comment).toHaveProperty('createdAt');
        expect(comment).toHaveProperty('isActive');
        
        // Verificar estructura del autor poblado
        expect(comment.author).toHaveProperty('username');
        expect(comment.author).toHaveProperty('firstName');
        expect(comment.author).toHaveProperty('lastName');
        expect(comment.author).not.toHaveProperty('password');
      });
    });

    test('Debería manejar paginación correctamente', async () => {
      const response = await request(app)
        .get('/api/comments?page=1&limit=2')
        .expect(200);

      // Verificar paginación específica
      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.totalComments).toBe(3);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
      expect(response.body.data.pagination.hasPrevPage).toBe(false);
      
      // Verificar segunda página
      const page2Response = await request(app)
        .get('/api/comments?page=2&limit=2')
        .expect(200);
        
      expect(page2Response.body.data.comments).toHaveLength(1);
      expect(page2Response.body.data.pagination.hasNextPage).toBe(false);
    });

    test('Debería manejar ordenamiento correctamente', async () => {
      const response = await request(app)
        .get('/api/comments?sortBy=createdAt&sortOrder=asc')
        .expect(200);

      expect(response.body.data.comments).toBeSortedByDate('createdAt', 'asc');
    });

    test('Debería devolver array vacío cuando no hay comentarios', async () => {
      // Limpiar todos los comentarios
      await Comment.deleteMany({});

      const response = await request(app)
        .get('/api/comments')
        .expect(200);

      expect(response.body.data.comments).toHaveLength(0);
      expect(response.body.data.pagination.totalComments).toBe(0);
      expect(response.body.data.pagination.totalPages).toBe(0);
    });
  });

  /**
   * TEST 2: GET /api/comments/:id - Obtener comentario por ID
   */
  describe('GET /api/comments/:id - Comentario por ID', () => {
    
    test('Debería obtener comentario por ID exitosamente', async () => {
      const response = await request(app)
        .get(`/api/comments/${testComment1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('comment');

      // Verificar datos específicos del comentario
      const comment = response.body.data.comment;
      expect(comment._id).toBe(testComment1._id.toString());
      expect(comment.content).toBe(testComment1.content);
      expect(comment.postId).toBe(testPost1._id.toString());
      expect(comment.userId).toBe(createdUser1._id.toString());
      
      // Verificar que incluye información del autor y post
      expect(comment).toHaveProperty('author');
      expect(comment.author.username).toBe(testUser1.username);
      expect(comment).toHaveProperty('post');
      expect(comment.post.content).toBe(testPost1.content);
    });

    test('Debería devolver error 404 para ID no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/comments/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Comentario no encontrado');
    });

    test('Debería devolver error 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/api/comments/invalid-mongo-id')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.message).toBe('Errores de validación');
    });

    test('Debería devolver error 404 para comentario inactivo', async () => {
      // Marcar comentario como inactivo
      await Comment.findByIdAndUpdate(testComment1._id, { isActive: false });

      const response = await request(app)
        .get(`/api/comments/${testComment1._id}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Comentario no disponible');
    });
  });

  /**
   * TEST 3: GET /api/comments/post/:postId - Comentarios por post
   */
  describe('GET /api/comments/post/:postId - Comentarios por post', () => {
    
    test('Debería obtener comentarios de un post específico', async () => {
      const response = await request(app)
        .get(`/api/comments/post/${testPost1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('comments');
      expect(response.body.data).toHaveProperty('post');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que devuelve solo comentarios del post especificado
      expect(response.body.data.comments).toHaveLength(2); // testPost1 tiene 2 comentarios
      response.body.data.comments.forEach(comment => {
        expect(comment.postId).toBe(testPost1._id.toString());
      });

      // Verificar información del post
      expect(response.body.data.post._id).toBe(testPost1._id.toString());
      expect(response.body.data.post.content).toContain('Post de prueba');
    });

    test('Debería manejar paginación para comentarios de post', async () => {
      const response = await request(app)
        .get(`/api/comments/post/${testPost1._id}?page=1&limit=1`)
        .expect(200);

      expect(response.body.data.comments).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalComments).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    test('Debería devolver error 404 para post no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/comments/post/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Post no encontrado');
    });

    test('Debería devolver array vacío para post sin comentarios', async () => {
      // Crear un post sin comentarios
      const newPost = await Post.create({
        userId: createdUser1._id,
        content: 'Post sin comentarios para testing',
        tags: ['test']
      });

      const response = await request(app)
        .get(`/api/comments/post/${newPost._id}`)
        .expect(200);

      expect(response.body.data.comments).toHaveLength(0);
      expect(response.body.data.pagination.totalComments).toBe(0);
    });
  });

  /**
   * TEST 4: GET /api/comments/user/:userId - Comentarios por usuario
   */
  describe('GET /api/comments/user/:userId - Comentarios por usuario', () => {
    
    test('Debería obtener comentarios de un usuario específico', async () => {
      const response = await request(app)
        .get(`/api/comments/user/${createdUser1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('comments');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que devuelve solo comentarios del usuario especificado
      expect(response.body.data.comments).toHaveLength(2); // createdUser1 tiene 2 comentarios
      response.body.data.comments.forEach(comment => {
        expect(comment.userId).toBe(createdUser1._id.toString());
      });

      // Verificar información del usuario
      expect(response.body.data.user._id).toBe(createdUser1._id.toString());
      expect(response.body.data.user.username).toBe(testUser1.username);
    });

    test('Debería devolver error 404 para usuario no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/comments/user/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Usuario no encontrado');
    });

    test('Debería devolver array vacío para usuario sin comentarios', async () => {
      // Crear un nuevo usuario sin comentarios
      const newUser = await User.create({
        username: 'usernocomments',
        email: 'nocomments@example.com',
        password: 'Password123',
        firstName: 'No',
        lastName: 'Comments'
      });

      const response = await request(app)
        .get(`/api/comments/user/${newUser._id}`)
        .expect(200);

      expect(response.body.data.comments).toHaveLength(0);
      expect(response.body.data.pagination.totalComments).toBe(0);
      expect(response.body.data.user._id).toBe(newUser._id.toString());
    });

    test('Debería manejar paginación en comentarios de usuario', async () => {
      const response = await request(app)
        .get(`/api/comments/user/${createdUser1._id}?page=1&limit=1`)
        .expect(200);

      expect(response.body.data.comments).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalComments).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });
  });

  /**
   * TESTS ADICIONALES: Casos límite y validación
   */
  describe('Casos límite y validación', () => {
    
    test('Debería manejar parámetros de consulta inválidos', async () => {
      const response = await request(app)
        .get('/api/comments?page=invalid&limit=invalid&sortBy=invalidField')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.message).toBe('Errores de validación');
    });

    test('Debería validar ObjectId en rutas de parámetros', async () => {
      const response = await request(app)
        .get('/api/comments/post/invalid-object-id')
        .expect(400);

      expect(response.body.message).toBe('Errores de validación');
    });

    test('Debería manejar comentarios solo activos por defecto', async () => {
      // Crear un comentario inactivo
      await Comment.create({
        postId: testPost1._id,
        userId: createdUser1._id,
        content: 'Comentario inactivo que no debería aparecer',
        isActive: false
      });

      const response = await request(app)
        .get('/api/comments')
        .expect(200);

      // Solo debería devolver los 3 comentarios activos originales
      expect(response.body.data.comments).toHaveLength(3);
      expect(response.body.data.pagination.totalComments).toBe(3);
    });
  });
});