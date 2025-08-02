// src/tests/post.test.js - Tests unitarios para rutas GET de posts
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server'); // Importar la aplicación Express
const User = require('../models/User');
const Post = require('../models/Post');

/**
 * Configuración de la base de datos de pruebas
 */
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/socialconnect_test';

// Datos de prueba
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

// Variables para almacenar usuarios y posts creados
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
});

beforeEach(async () => {
  // Limpiar la base de datos antes de cada test
  await User.deleteMany({});
  await Post.deleteMany({});
  
  // Crear usuarios de prueba
  createdUser1 = await User.create(testUser);
  createdUser2 = await User.create(testUser2);
  
  // Crear posts de prueba
  testPost1 = await Post.create({
    userId: createdUser1._id,
    content: 'Este es el primer post de prueba',
    tags: ['test', 'primero']
  });
  
  testPost2 = await Post.create({
    userId: createdUser1._id,
    content: 'Este es el segundo post con imagen',
    imageUrl: 'https://example.com/image.jpg',
    tags: ['test', 'imagen']
  });
  
  testPost3 = await Post.create({
    userId: createdUser2._id,
    content: 'Post del segundo usuario sobre JavaScript',
    tags: ['javascript', 'programming']
  });
});

afterEach(async () => {
  // Limpiar la base de datos después de cada test
  await User.deleteMany({});
  await Post.deleteMany({});
});

afterAll(async () => {
  // Cerrar la conexión después de todos los tests
  await mongoose.connection.close();
});

/**
 * Suite de tests para rutas GET de posts
 */
describe('Post GET Routes', () => {
  
  /**
   * Tests para GET /api/posts
   * Esta ruta obtiene la lista de todos los posts con paginación
   */
  describe('GET /api/posts', () => {
    
    test('Debería obtener lista de posts exitosamente', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('posts');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que devuelve los posts creados
      expect(response.body.data.posts).toHaveLength(3);
      
      // Verificar que cada post tiene la estructura correcta
      const post = response.body.data.posts[0];
      expect(post).toHaveProperty('_id');
      expect(post).toHaveProperty('userId');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('author');
      expect(post.author).toHaveProperty('username');
      expect(post.author).toHaveProperty('firstName');
      expect(post.author).toHaveProperty('lastName');
    });

    test('Debería manejar paginación correctamente', async () => {
      const response = await request(app)
        .get('/api/posts?page=1&limit=2')
        .expect(200);

      // Verificar paginación
      expect(response.body.data.posts).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.totalPosts).toBe(3);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    test('Debería filtrar por etiquetas correctamente', async () => {
      const response = await request(app)
        .get('/api/posts?tags=javascript')
        .expect(200);

      // Verificar que devuelve solo posts con la etiqueta especificada
      expect(response.body.data.posts).toHaveLength(1);
      expect(response.body.data.posts[0].tags).toContain('javascript');
    });

    test('Debería manejar ordenamiento por diferentes campos', async () => {
      const response = await request(app)
        .get('/api/posts?sortBy=likesCount&sortOrder=desc')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.posts).toHaveLength(3);
    });

    test('Debería devolver array vacío cuando no hay posts', async () => {
      // Limpiar todos los posts
      await Post.deleteMany({});

      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.data.posts).toHaveLength(0);
      expect(response.body.data.pagination.totalPosts).toBe(0);
    });
  });

  /**
   * Tests para GET /api/posts/:id
   * Esta ruta obtiene un post específico por su ID
   */
  describe('GET /api/posts/:id', () => {
    
    test('Debería obtener post por ID exitosamente', async () => {
      const response = await request(app)
        .get(`/api/posts/${testPost1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('post');

      // Verificar datos del post
      const post = response.body.data.post;
      expect(post._id).toBe(testPost1._id.toString());
      expect(post.content).toBe(testPost1.content);
      expect(post.userId).toBe(createdUser1._id.toString());
      
      // Verificar que incluye información del autor
      expect(post).toHaveProperty('author');
      expect(post.author.username).toBe(testUser.username);
      expect(post.author.firstName).toBe(testUser.firstName);
    });

    test('Debería devolver error 404 para ID no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/posts/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Post no encontrado');
    });

    test('Debería devolver error 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/api/posts/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Errores de validación');
    });

    test('Debería devolver error 404 para post inactivo', async () => {
      // Marcar post como inactivo
      await Post.findByIdAndUpdate(testPost1._id, { isActive: false });

      const response = await request(app)
        .get(`/api/posts/${testPost1._id}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Post no disponible');
    });
  });

  /**
   * Tests para GET /api/posts/user/:userId
   * Esta ruta obtiene posts de un usuario específico
   */
  describe('GET /api/posts/user/:userId', () => {
    
    test('Debería obtener posts de un usuario específico', async () => {
      const response = await request(app)
        .get(`/api/posts/user/${createdUser1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveProperty('success', true);
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
    });

    test('Debería manejar paginación para posts de usuario', async () => {
      const response = await request(app)
        .get(`/api/posts/user/${createdUser1._id}?page=1&limit=1`)
        .expect(200);

      expect(response.body.data.posts).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPosts).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    test('Debería devolver error 404 para usuario no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/posts/user/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
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
    });
  });

  /**
   * Tests para GET /api/posts/feed/recent
   * Esta ruta obtiene posts recientes para el feed principal
   */
  describe('GET /api/posts/feed/recent', () => {
    
    test('Debería obtener posts recientes correctamente', async () => {
      const response = await request(app)
        .get('/api/posts/feed/recent')
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Posts recientes obtenidos exitosamente');
      expect(response.body.data).toHaveProperty('posts');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que devuelve todos los posts ordenados por fecha
      expect(response.body.data.posts).toHaveLength(3);
      
      // Verificar que están ordenados por fecha de creación (más reciente primero)
      const posts = response.body.data.posts;
      for (let i = 0; i < posts.length - 1; i++) {
        const currentDate = new Date(posts[i].createdAt);
        const nextDate = new Date(posts[i + 1].createdAt);
        expect(currentDate >= nextDate).toBe(true);
      }
    });

    test('Debería manejar paginación en feed reciente', async () => {
      const response = await request(app)
        .get('/api/posts/feed/recent?page=1&limit=2')
        .expect(200);

      expect(response.body.data.posts).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });
  });

  /**
   * Tests para GET /api/posts/search
   * Esta ruta busca posts por contenido
   */
  describe('GET /api/posts/search', () => {
    
    test('Debería buscar posts por contenido exitosamente', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=JavaScript')
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('posts');
      expect(response.body.data).toHaveProperty('searchTerm', 'JavaScript');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que encuentra el post con JavaScript
      expect(response.body.data.posts).toHaveLength(1);
      expect(response.body.data.posts[0].content).toContain('JavaScript');
    });

    test('Debería buscar posts por etiquetas', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=test')
        .expect(200);

      // Debería encontrar posts que tienen 'test' en las etiquetas
      expect(response.body.data.posts.length).toBeGreaterThan(0);
      
      // Verificar que los resultados contienen el término buscado
      const hasMatchingTag = response.body.data.posts.some(post => 
        post.tags.includes('test') || post.content.toLowerCase().includes('test')
      );
      expect(hasMatchingTag).toBe(true);
    });

    test('Debería devolver error 400 sin término de búsqueda', async () => {
      const response = await request(app)
        .get('/api/posts/search')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('término de búsqueda');
    });

    test('Debería devolver error 400 con término vacío', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('término de búsqueda');
    });

    test('Debería devolver array vacío cuando no encuentra resultados', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=termino-inexistente')
        .expect(200);

      expect(response.body.data.posts).toHaveLength(0);
      expect(response.body.data.pagination.totalPosts).toBe(0);
    });

    test('Debería manejar paginación en búsqueda', async () => {
      const response = await request(app)
        .get('/api/posts/search?q=post&page=1&limit=1')
        .expect(200);

      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
  });

  /**
   * Tests adicionales para edge cases y manejo de errores
   */
  describe('Edge Cases y Manejo de Errores', () => {
    
    test('GET /api/posts debería manejar parámetros de consulta inválidos', async () => {
      const response = await request(app)
        .get('/api/posts?page=invalid&limit=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Errores de validación');
    });

    test('GET /api/posts debería manejar sortBy inválido', async () => {
      const response = await request(app)
        .get('/api/posts?sortBy=invalidField')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('validación');
    });

    test('GET /api/posts debería usar valores por defecto', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    test('GET /api/posts/user/:userId debería validar ObjectId', async () => {
      const response = await request(app)
        .get('/api/posts/user/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('validación');
    });
  });
});