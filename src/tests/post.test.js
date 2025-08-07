// src/tests/post.test.js - Tests unitarios completos para posts (4+ tests)
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../models/User');
const Post = require('../models/Post');

/**
 * Configuración de la base de datos de pruebas
 * Usa una base de datos separada para no interferir con desarrollo
 */
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/socialconnect_test';

// Datos de prueba reutilizables
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123',
  firstName: 'Test',
  lastName: 'User',
  bio: 'Usuario de prueba para testing'
};

const testUser2 = {
  username: 'testuser2',
  email: 'test2@example.com',
  password: 'Password123',
  firstName: 'Test2',
  lastName: 'User2',
  bio: 'Segundo usuario de prueba'
};

// Variables para almacenar datos creados durante los tests
let createdUser1;
let createdUser2;
let testPost1;
let testPost2;
let testPost3;

/**
 * Setup y teardown de la suite de tests
 */
beforeAll(async () => {
  // Conectar a la base de datos de pruebas
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('🧪 Conectado a base de datos de pruebas para posts');
});

beforeEach(async () => {
  // Limpiar base de datos antes de cada test
  await User.deleteMany({});
  await Post.deleteMany({});
  
  // Crear usuarios de prueba
  createdUser1 = await User.create(testUser);
  createdUser2 = await User.create(testUser2);
  
  // Crear posts de prueba con diferentes características
  testPost1 = await Post.create({
    userId: createdUser1._id,
    content: 'Este es el primer post de prueba con contenido básico',
    tags: ['test', 'primero', 'basico']
  });
  
  testPost2 = await Post.create({
    userId: createdUser1._id,
    content: 'Segundo post con imagen para probar funcionalidad multimedia',
    imageUrl: 'https://example.com/test-image.jpg',
    tags: ['test', 'imagen', 'multimedia']
  });
  
  testPost3 = await Post.create({
    userId: createdUser2._id,
    content: 'Post del segundo usuario sobre JavaScript y programación',
    tags: ['javascript', 'programming', 'desarrollo']
  });
});

afterEach(async () => {
  // Limpiar base de datos después de cada test
  await User.deleteMany({});
  await Post.deleteMany({});
});

afterAll(async () => {
  // Cerrar conexión después de todos los tests
  await mongoose.connection.close();
  console.log('🔌 Conexión a base de datos de pruebas cerrada');
});

/**
 * Suite de tests para endpoints GET de posts
 */
describe('Post GET Endpoints Tests', () => {
  
  /**
   * TEST 1: GET /api/posts - Obtener lista de posts
   * Verifica funcionalidad de feed público con paginación y filtros
   */
  describe('GET /api/posts - Lista de posts', () => {
    
    test('Debería obtener lista de posts exitosamente', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      // Verificar estructura de la respuesta usando matcher personalizado
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('posts');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHavePaginationStructure();

      // Verificar que devuelve los posts creados
      expect(response.body.data.posts).toHaveLength(3);
      
      // Verificar estructura de cada post
      response.body.data.posts.forEach(post => {
        expect(post).toHaveProperty('_id');
        expect(post).toHaveProperty('userId');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('author');
        expect(post).toHaveProperty('likesCount');
        expect(post).toHaveProperty('commentsCount');
        expect(post).toHaveProperty('createdAt');
        expect(post).toHaveProperty('isActive');
        
        // Verificar estructura del autor poblado
        expect(post.author).toHaveProperty('username');
        expect(post.author).toHaveProperty('firstName');
        expect(post.author).toHaveProperty('lastName');
        expect(post.author).not.toHaveProperty('password');
      });
    });

    test('Debería manejar paginación correctamente', async () => {
      const response = await request(app)
        .get('/api/posts?page=1&limit=2')
        .expect(200);

      // Verificar paginación específica
      expect(response.body.data.posts).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.totalPosts).toBe(3);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
      expect(response.body.data.pagination.hasPrevPage).toBe(false);
      
      // Verificar segunda página
      const page2Response = await request(app)
        .get('/api/posts?page=2&limit=2')
        .expect(200);
        
      expect(page2Response.body.data.posts).toHaveLength(1);
      expect(page2Response.body.data.pagination.hasNextPage).toBe(false);
    });

    test('Debería filtrar por etiquetas correctamente', async () => {
      const response = await request(app)
        .get('/api/posts?tags=javascript')
        .expect(200);

      // Verificar que devuelve solo posts con la etiqueta especificada
      expect(response.body.data.posts).toHaveLength(1);
      expect(response.body.data.posts[0].tags).toContain('javascript');
      expect(response.body.data.posts[0].content).toContain('JavaScript');
    });

    test('Debería manejar ordenamiento por diferentes campos', async () => {
      // Probar ordenamiento por fecha de creación descendente (por defecto)
      const responseDesc = await request(app)
        .get('/api/posts?sortBy=createdAt&sortOrder=desc')
        .expect(200);

      expect(responseDesc.body.data.posts).toBeSortedByDate('createdAt', 'desc');
      
      // Probar ordenamiento por fecha ascendente
      const responseAsc = await request(app)
        .get('/api/posts?sortBy=createdAt&sortOrder=asc')
        .expect(200);

      expect(responseAsc.body.data.posts).toBeSortedByDate('createdAt', 'asc');
    });

    test('Debería devolver array vacío cuando no hay posts', async () => {
      // Limpiar todos los posts
      await Post.deleteMany({});

      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.data.posts).toHaveLength(0);
      expect(response.body.data.pagination.totalPosts).toBe(0);
      expect(response.body.data.pagination.totalPages).toBe(0);
    });

    test('Debería manejar filtros múltiples correctamente', async () => {
      const response = await request(app)
        .get('/api/posts?tags=test&sortBy=likesCount&sortOrder=desc&limit=5')
        .expect(200);

      expect(response.body.data.posts.length).toBeGreaterThan(0);
      
      // Verificar que todos los posts tienen la etiqueta 'test'
      response.body.data.posts.forEach(post => {
        expect(post.tags).toContain('test');
      });
    });
  });

  /**
   * TEST 2: GET /api/posts/:id - Obtener post por ID
   * Verifica obtención de posts individuales
   */
  describe('GET /api/posts/:id - Post por ID', () => {
    
    test('Debería obtener post por ID exitosamente', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPost1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('post');

      // Verificar datos específicos del post
      const post = response.body.data.post;
      expect(post._id).toBe(testPost1._id.toString());
      expect(post.content).toBe(testPost1.content);
      expect(post.userId).toBe(createdUser1._id.toString());
      expect(post.tags).toEqual(expect.arrayContaining(['test', 'primero', 'basico']));
      
      // Verificar que incluye información del autor
      expect(post).toHaveProperty('author');
      expect(post.author.username).toBe(testUser.username);
      expect(post.author.firstName).toBe(testUser.firstName);
      expect(post.author).not.toHaveProperty('password');
    });

    test('Debería obtener post con imagen exitosamente', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPost2._id}`)
        .expect(200);

      const post = response.body.data.post;
      expect(post.imageUrl).toBe('https://example.com/test-image.jpg');
      expect(post.contentType).toBe('text_image');
      expect(post.tags).toContain('imagen');
    });

    test('Debería devolver error 404 para ID no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/posts/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Post no encontrado');
    });

    test('Debería devolver error 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/api/posts/invalid-mongo-id')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.message).toBe('Errores de validación');
      expect(response.body.errors[0].field).toBe('id');
    });

    test('Debería devolver error 404 para post inactivo', async () => {
      // Marcar post como inactivo (soft delete)
      await Post.findByIdAndUpdate(testPost1._id, { isActive: false });

      const response = await request(app)
        .get(`/api/posts/${testPost1._id}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Post no disponible');
    });
  });

  /**
   * TEST 3: GET /api/posts/user/:userId - Posts de usuario específico
   * Verifica funcionalidad de perfil de usuario
   */
  describe('GET /api/posts/user/:userId - Posts por usuario', () => {
    
    test('Debería obtener posts de un usuario específico', async () => {
      const response = await request(app)
        .get(`/api/posts/user/${createdUser1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('posts');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que devuelve solo posts del usuario especificado
      expect(response.body.data.posts).toHaveLength(2); // createdUser1 tiene 2 posts
      response.body.data.posts.forEach(post => {
        expect(post.userId).toBe(createdUser1._id.toString());
      });

      // Verificar información del usuario
      expect(response.body.data.user._id).toBe(createdUser1._id.toString());
      expect(response.body.data.user.username).toBe(testUser.username);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('Debería manejar paginación para posts de usuario', async () => {
      const response = await request(app)
        .get(`/api/posts/user/${createdUser1._id}?page=1&limit=1`)
        .expect(200);

      expect(response.body.data.posts).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPosts).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
      
      // Verificar segunda página
      const page2Response = await request(app)
        .get(`/api/posts/user/${createdUser1._id}?page=2&limit=1`)
        .expect(200);
        
      expect(page2Response.body.data.posts).toHaveLength(1);
      expect(page2Response.body.data.pagination.hasNextPage).toBe(false);
    });

    test('Debería devolver error 404 para usuario no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/posts/user/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Usuario no encontrado');
    });

    test('Debería devolver array vacío para usuario sin posts', async () => {
      // Crear un nuevo usuario sin posts
      const newUser = await User.create({
        username: 'userwithoutposts',
        email: 'noposts@example.com',
        password: 'Password123',
        firstName: 'No',
        lastName: 'Posts'
      });

      const response = await request(app)
        .get(`/api/posts/user/${newUser._id}`)
        .expect(200);

      expect(response.body.data.posts).toHaveLength(0);
      expect(response.body.data.pagination.totalPosts).toBe(0);
      expect(response.body.data.user._id).toBe(newUser._id.toString());
    });

    test('Debería manejar ordenamiento en posts de usuario', async () => {
      const response = await request(app)
        .get(`/api/posts/user/${createdUser1._id}?sortBy=createdAt&sortOrder=asc`)
        .expect(200);

      expect(response.body.data.posts).toBeSortedByDate('createdAt', 'asc');
    });
  });

  /**
   * TEST 4: GET /api/posts/search - Búsqueda de posts
   * Verifica funcionalidad de búsqueda por contenido y etiquetas
   */
  describe('GET /api/posts/search - Búsqueda de posts', () => {
    
    test('Debería buscar posts por contenido exitosamente', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=JavaScript')
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('posts');
      expect(response.body.data).toHaveProperty('searchTerm', 'JavaScript');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que encuentra el post con JavaScript
      expect(response.body.data.posts).toHaveLength(1);
      const post = response.body.data.posts[0];
      expect(post.content.toLowerCase()).toContain('javascript');
    });

    test('Debería buscar posts por etiquetas', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=programming')
        .expect(200);

      // Debería encontrar posts que tienen 'programming' en las etiquetas
      expect(response.body.data.posts.length).toBeGreaterThan(0);
      
      const post = response.body.data.posts[0];
      expect(post.tags).toContain('programming');
    });

    test('Debería realizar búsqueda case-insensitive', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=JAVASCRIPT') // Mayúsculas
        .expect(200);

      expect(response.body.data.posts.length).toBeGreaterThan(0);
      const post = response.body.data.posts[0];
      expect(post.content.toLowerCase()).toContain('javascript');
    });

    test('Debería manejar búsqueda en múltiples campos', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=test')
        .expect(200);

      // Debería encontrar posts que contienen 'test' en contenido o etiquetas
      expect(response.body.data.posts.length).toBeGreaterThan(0);
      
      response.body.data.posts.forEach(post => {
        const hasInContent = post.content.toLowerCase().includes('test');
        const hasInTags = post.tags.some(tag => tag.toLowerCase().includes('test'));
        expect(hasInContent || hasInTags).toBe(true);
      });
    });

    test('Debería devolver error 400 sin término de búsqueda', async () => {
      const response = await request(app)
        .get('/api/posts/search')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('término de búsqueda');
    });

    test('Debería devolver error 400 con término vacío', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('término de búsqueda');
    });

    test('Debería devolver array vacío cuando no encuentra resultados', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=termino-completamente-inexistente-xyz')
        .expect(200);

      expect(response.body.data.posts).toHaveLength(0);
      expect(response.body.data.pagination.totalPosts).toBe(0);
      expect(response.body.data.searchTerm).toBe('termino-completamente-inexistente-xyz');
    });

    test('Debería manejar paginación en búsqueda', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=post&page=1&limit=2')
        .expect(200);

      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });
  });

  /**
   * TEST ADICIONAL: GET /api/posts/feed/recent - Feed de posts recientes
   */
  describe('GET /api/posts/feed/recent - Feed reciente', () => {
    
    test('Debería obtener posts recientes ordenados por fecha', async () => {
      const response = await request(app)
        .get('/api/posts/feed/recent')
        .expect(200);

      expect(response.body).toHaveApiStructure(true);
      expect(response.body.message).toBe('Posts recientes obtenidos exitosamente');
      expect(response.body.data.posts).toHaveLength(3);
      
      // Verificar ordenamiento por fecha (más reciente primero)
      expect(response.body.data.posts).toBeSortedByDate('createdAt', 'desc');
    });

    test('Debería manejar paginación en feed reciente', async () => {
      const response = await request(app)
        .get('/api/posts/feed/recent?page=1&limit=2')
        .expect(200);

      expect(response.body.data.posts).toHaveLength(2);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });
  });

  /**
   * TEST DE CASOS LÍMITE Y VALIDACIÓN
   */
  describe('Casos límite y validación', () => {
    
    test('Debería manejar parámetros de consulta inválidos', async () => {
      const response = await request(app)
        .get('/api/posts?page=invalid&limit=invalid&sortBy=invalidField')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.message).toBe('Errores de validación');
      expect(response.body.errors).toHaveLength(3);
    });

    test('Debería validar ObjectId en rutas de parámetros', async () => {
      const response = await request(app)
        .get('/api/posts/user/invalid-object-id')
        .expect(400);

      expect(response.body.message).toBe('Errores de validación');
      expect(response.body.errors[0].field).toBe('userId');
    });

    test('Debería manejar posts solo activos por defecto', async () => {
      // Crear un post inactivo
      await Post.create({
        userId: createdUser1._id,
        content: 'Post inactivo que no debería aparecer',
        isActive: false
      });

      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      // Solo debería devolver los 3 posts activos originales
      expect(response.body.data.posts).toHaveLength(3);
      expect(response.body.data.pagination.totalPosts).toBe(3);
    });
  });
});