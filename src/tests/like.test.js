// src/tests/like.test.js - Tests unitarios completos para likes (4+ tests)
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');

/**
 * Configuración de la base de datos de pruebas
 */
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/socialconnect_test';

// Datos de prueba reutilizables
const testUser1 = {
  username: 'liker1',
  email: 'liker1@example.com',
  password: 'Password123',
  firstName: 'Like',
  lastName: 'User1',
  bio: 'Usuario de prueba para likes'
};

const testUser2 = {
  username: 'liker2',
  email: 'liker2@example.com',
  password: 'Password123',
  firstName: 'Like',
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
let testLike1;
let testLike2;
let testLike3;
let testLike4;

/**
 * Setup y teardown de la suite de tests
 */
beforeAll(async () => {
  // Conectar a la base de datos de pruebas
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('🧪 Conectado a base de datos de pruebas para likes');
});

beforeEach(async () => {
  // Limpiar base de datos antes de cada test
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await Like.deleteMany({});
  
  // Crear usuarios de prueba
  createdUser1 = await User.create(testUser1);
  createdUser2 = await User.create(testUser2);
  
  // Crear posts de prueba
  testPost1 = await Post.create({
    userId: createdUser1._id,
    content: 'Post de prueba para likes número 1',
    tags: ['test', 'likes']
  });
  
  testPost2 = await Post.create({
    userId: createdUser2._id,
    content: 'Segundo post de prueba para likes',
    tags: ['test', 'segunda-prueba']
  });
  
  // Crear comentarios de prueba
  testComment1 = await Comment.create({
    postId: testPost1._id,
    userId: createdUser1._id,
    content: 'Comentario de prueba para likes'
  });
  
  testComment2 = await Comment.create({
    postId: testPost2._id,
    userId: createdUser2._id,
    content: 'Segundo comentario de prueba'
  });
  
  // Crear likes de prueba
  testLike1 = await Like.create({
    userId: createdUser1._id,
    targetType: 'Post',
    targetId: testPost1._id
  });
  
  testLike2 = await Like.create({
    userId: createdUser2._id,
    targetType: 'Post',
    targetId: testPost1._id
  });
  
  testLike3 = await Like.create({
    userId: createdUser1._id,
    targetType: 'Comment',
    targetId: testComment1._id
  });
  
  testLike4 = await Like.create({
    userId: createdUser2._id,
    targetType: 'Post',
    targetId: testPost2._id
  });
});

afterEach(async () => {
  // Limpiar base de datos después de cada test
  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await Like.deleteMany({});
});

afterAll(async () => {
  // Cerrar conexión después de todos los tests
  await mongoose.connection.close();
  console.log('🔌 Conexión a base de datos de pruebas cerrada');
});

/**
 * Suite de tests para endpoints GET de likes
 */
describe('Like GET Endpoints Tests', () => {
  
  /**
   * TEST 1: GET /api/likes - Obtener lista de likes
   */
  describe('GET /api/likes - Lista de likes', () => {
    
    test('Debería obtener lista de likes exitosamente', async () => {
      const response = await request(app)
        .get('/api/likes')
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('likes');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHavePaginationStructure();

      // Verificar que devuelve los likes creados
      expect(response.body.data.likes).toHaveLength(4);
      
      // Verificar estructura de cada like
      response.body.data.likes.forEach(like => {
        expect(like).toHaveProperty('_id');
        expect(like).toHaveProperty('userId');
        expect(like).toHaveProperty('targetType');
        expect(like).toHaveProperty('targetId');
        expect(like).toHaveProperty('user');
        expect(like).toHaveProperty('isActive');
        expect(like).toHaveProperty('createdAt');
        
        // Verificar que targetType es válido
        expect(['Post', 'Comment']).toContain(like.targetType);
        
        // Verificar estructura del usuario poblado
        expect(like.user).toHaveProperty('username');
        expect(like.user).toHaveProperty('firstName');
        expect(like.user).toHaveProperty('lastName');
        expect(like.user).not.toHaveProperty('password');
      });
    });

    test('Debería manejar paginación correctamente', async () => {
      const response = await request(app)
        .get('/api/likes?page=1&limit=2')
        .expect(200);

      // Verificar paginación específica
      expect(response.body.data.likes).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.totalLikes).toBe(4);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
      expect(response.body.data.pagination.hasPrevPage).toBe(false);
      
      // Verificar segunda página
      const page2Response = await request(app)
        .get('/api/likes?page=2&limit=2')
        .expect(200);
        
      expect(page2Response.body.data.likes).toHaveLength(2);
      expect(page2Response.body.data.pagination.hasNextPage).toBe(true);
    });

    test('Debería filtrar por tipo de contenido correctamente', async () => {
      // Filtrar solo likes de posts
      const postLikesResponse = await request(app)
        .get('/api/likes?targetType=Post')
        .expect(200);

      expect(postLikesResponse.body.data.likes).toHaveLength(3);
      postLikesResponse.body.data.likes.forEach(like => {
        expect(like.targetType).toBe('Post');
      });
      
      // Filtrar solo likes de comentarios
      const commentLikesResponse = await request(app)
        .get('/api/likes?targetType=Comment')
        .expect(200);

      expect(commentLikesResponse.body.data.likes).toHaveLength(1);
      commentLikesResponse.body.data.likes.forEach(like => {
        expect(like.targetType).toBe('Comment');
      });
    });

    test('Debería manejar ordenamiento correctamente', async () => {
      const response = await request(app)
        .get('/api/likes?sortBy=createdAt&sortOrder=asc')
        .expect(200);

      expect(response.body.data.likes).toBeSortedByDate('createdAt', 'asc');
    });

    test('Debería devolver array vacío cuando no hay likes', async () => {
      // Limpiar todos los likes
      await Like.deleteMany({});

      const response = await request(app)
        .get('/api/likes')
        .expect(200);

      expect(response.body.data.likes).toHaveLength(0);
      expect(response.body.data.pagination.totalLikes).toBe(0);
      expect(response.body.data.pagination.totalPages).toBe(0);
    });
  });

  /**
   * TEST 2: GET /api/likes/:id - Obtener like por ID
   */
  describe('GET /api/likes/:id - Like por ID', () => {
    
    test('Debería obtener like por ID exitosamente', async () => {
      const response = await request(app)
        .get(`/api/likes/${testLike1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('like');

      // Verificar datos específicos del like
      const like = response.body.data.like;
      expect(like._id).toBe(testLike1._id.toString());
      expect(like.targetType).toBe('Post');
      expect(like.targetId).toBe(testPost1._id.toString());
      expect(like.userId).toBe(createdUser1._id.toString());
      
      // Verificar que incluye información del usuario
      expect(like).toHaveProperty('user');
      expect(like.user.username).toBe(testUser1.username);
      expect(like.user).not.toHaveProperty('password');
    });

    test('Debería devolver error 404 para ID no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/likes/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Like no encontrado');
    });

    test('Debería devolver error 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/api/likes/invalid-mongo-id')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.message).toBe('Errores de validación');
    });

    test('Debería devolver error 404 para like inactivo', async () => {
      // Marcar like como inactivo
      await Like.findByIdAndUpdate(testLike1._id, { isActive: false });

      const response = await request(app)
        .get(`/api/likes/${testLike1._id}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Like no disponible');
    });
  });

  /**
   * TEST 3: GET /api/likes/post/:postId - Likes por post
   */
  describe('GET /api/likes/post/:postId - Likes por post', () => {
    
    test('Debería obtener likes de un post específico', async () => {
      const response = await request(app)
        .get(`/api/likes/post/${testPost1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('likes');
      expect(response.body.data).toHaveProperty('post');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que devuelve solo likes del post especificado
      expect(response.body.data.likes).toHaveLength(2); // testPost1 tiene 2 likes
      response.body.data.likes.forEach(like => {
        expect(like.targetType).toBe('Post');
        expect(like.targetId).toBe(testPost1._id.toString());
      });

      // Verificar información del post
      expect(response.body.data.post._id).toBe(testPost1._id.toString());
      expect(response.body.data.post.content).toContain('Post de prueba');
    });

    test('Debería manejar paginación para likes de post', async () => {
      const response = await request(app)
        .get(`/api/likes/post/${testPost1._id}?page=1&limit=1`)
        .expect(200);

      expect(response.body.data.likes).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalLikes).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    test('Debería devolver error 404 para post no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/likes/post/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Post no encontrado');
    });

    test('Debería devolver array vacío para post sin likes', async () => {
      // Crear un post sin likes
      const newPost = await Post.create({
        userId: createdUser1._id,
        content: 'Post sin likes para testing',
        tags: ['test']
      });

      const response = await request(app)
        .get(`/api/likes/post/${newPost._id}`)
        .expect(200);

      expect(response.body.data.likes).toHaveLength(0);
      expect(response.body.data.pagination.totalLikes).toBe(0);
    });
  });

  /**
   * TEST 4: GET /api/likes/comment/:commentId - Likes por comentario
   */
  describe('GET /api/likes/comment/:commentId - Likes por comentario', () => {
    
    test('Debería obtener likes de un comentario específico', async () => {
      const response = await request(app)
        .get(`/api/likes/comment/${testComment1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('likes');
      expect(response.body.data).toHaveProperty('comment');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que devuelve solo likes del comentario especificado
      expect(response.body.data.likes).toHaveLength(1); // testComment1 tiene 1 like
      response.body.data.likes.forEach(like => {
        expect(like.targetType).toBe('Comment');
        expect(like.targetId).toBe(testComment1._id.toString());
      });

      // Verificar información del comentario
      expect(response.body.data.comment._id).toBe(testComment1._id.toString());
      expect(response.body.data.comment.content).toBe(testComment1.content);
    });

    test('Debería devolver error 404 para comentario no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/likes/comment/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Comentario no encontrado');
    });

    test('Debería devolver array vacío para comentario sin likes', async () => {
      const response = await request(app)
        .get(`/api/likes/comment/${testComment2._id}`)
        .expect(200);

      expect(response.body.data.likes).toHaveLength(0);
      expect(response.body.data.pagination.totalLikes).toBe(0);
    });

    test('Debería manejar paginación para likes de comentario', async () => {
      // Crear más likes para el comentario
      await Like.create({
        userId: createdUser2._id,
        targetType: 'Comment',
        targetId: testComment1._id
      });

      const response = await request(app)
        .get(`/api/likes/comment/${testComment1._id}?page=1&limit=1`)
        .expect(200);

      expect(response.body.data.likes).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalLikes).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });
  });

  /**
   * TEST 5: GET /api/likes/user/:userId - Likes por usuario
   */
  describe('GET /api/likes/user/:userId - Likes por usuario', () => {
    
    test('Debería obtener likes de un usuario específico', async () => {
      const response = await request(app)
        .get(`/api/likes/user/${createdUser1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('likes');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que devuelve solo likes del usuario especificado
      expect(response.body.data.likes).toHaveLength(2); // createdUser1 tiene 2 likes
      response.body.data.likes.forEach(like => {
        expect(like.userId).toBe(createdUser1._id.toString());
      });

      // Verificar información del usuario
      expect(response.body.data.user._id).toBe(createdUser1._id.toString());
      expect(response.body.data.user.username).toBe(testUser1.username);
    });

    test('Debería filtrar por tipo de contenido en likes de usuario', async () => {
      const response = await request(app)
        .get(`/api/likes/user/${createdUser1._id}?targetType=Post`)
        .expect(200);

      expect(response.body.data.likes).toHaveLength(1);
      response.body.data.likes.forEach(like => {
        expect(like.targetType).toBe('Post');
        expect(like.userId).toBe(createdUser1._id.toString());
      });
    });

    test('Debería devolver error 404 para usuario no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/likes/user/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Usuario no encontrado');
    });

    test('Debería devolver array vacío para usuario sin likes', async () => {
      // Crear un nuevo usuario sin likes
      const newUser = await User.create({
        username: 'usernolikes',
        email: 'nolikes@example.com',
        password: 'Password123',
        firstName: 'No',
        lastName: 'Likes'
      });

      const response = await request(app)
        .get(`/api/likes/user/${newUser._id}`)
        .expect(200);

      expect(response.body.data.likes).toHaveLength(0);
      expect(response.body.data.pagination.totalLikes).toBe(0);
      expect(response.body.data.user._id).toBe(newUser._id.toString());
    });
  });

  /**
   * TESTS ADICIONALES: Casos límite y validación
   */
  describe('Casos límite y validación', () => {
    
    test('Debería manejar parámetros de consulta inválidos', async () => {
      const response = await request(app)
        .get('/api/likes?page=invalid&limit=invalid&targetType=invalid')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.message).toBe('Errores de validación');
    });

    test('Debería validar ObjectId en rutas de parámetros', async () => {
      const response = await request(app)
        .get('/api/likes/post/invalid-object-id')
        .expect(400);

      expect(response.body.message).toBe('Errores de validación');
    });

    test('Debería manejar likes solo activos por defecto', async () => {
      // Crear un like inactivo
      await Like.create({
        userId: createdUser1._id,
        targetType: 'Post',
        targetId: testPost1._id,
        isActive: false
      });

      const response = await request(app)
        .get('/api/likes')
        .expect(200);

      // Solo debería devolver los 4 likes activos originales
      expect(response.body.data.likes).toHaveLength(4);
      expect(response.body.data.pagination.totalLikes).toBe(4);
    });

    test('Debería validar targetType en filtros de consulta', async () => {
      const response = await request(app)
        .get('/api/likes?targetType=InvalidType')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
    });
  });
});