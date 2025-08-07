// src/tests/user.test.js - Tests unitarios completos para usuarios (4+ tests)
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../models/User');

/**
 * Configuración de la base de datos de pruebas
 * MONGODB_URI debe apuntar a una base de datos separada para testing
 * para no interferir con los datos de desarrollo
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

// Variables para almacenar usuarios creados durante los tests
let createdUser1;
let createdUser2;

/**
 * Setup y teardown de la suite de tests
 * beforeAll: se ejecuta una vez antes de todos los tests
 * beforeEach: se ejecuta antes de cada test individual
 * afterEach: se ejecuta después de cada test individual
 * afterAll: se ejecuta una vez después de todos los tests
 */
beforeAll(async () => {
  // Conectar a la base de datos de pruebas
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('🧪 Conectado a base de datos de pruebas');
});

beforeEach(async () => {
  // Limpiar la base de datos antes de cada test para aislamiento
  await User.deleteMany({});
  
  // Crear usuarios de prueba frescos para cada test
  createdUser1 = await User.create(testUser);
  createdUser2 = await User.create(testUser2);
});

afterEach(async () => {
  // Limpiar la base de datos después de cada test
  await User.deleteMany({});
});

afterAll(async () => {
  // Cerrar la conexión después de todos los tests
  await mongoose.connection.close();
  console.log('🔌 Conexión a base de datos de pruebas cerrada');
});

/**
 * Suite de tests para endpoints GET de usuarios
 * Cada describe() agrupa tests relacionados
 */
describe('User GET Endpoints Tests', () => {
  
  /**
   * TEST 1: GET /api/users - Obtener lista de usuarios
   * Verifica que la API devuelve la lista de usuarios con paginación
   */
  describe('GET /api/users - Lista de usuarios', () => {
    
    test('Debería obtener lista de usuarios exitosamente', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHavePaginationStructure();

      // Verificar que devuelve los usuarios creados
      expect(response.body.data.users).toHaveLength(2);
      
      // Verificar que cada usuario tiene la estructura correcta
      response.body.data.users.forEach(user => {
        expect(user).toHaveProperty('_id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('firstName');
        expect(user).toHaveProperty('lastName');
        // Verificar que NO devuelve contraseñas
        expect(user).not.toHaveProperty('password');
      });
    });

    test('Debería manejar paginación correctamente', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=1')
        .expect(200);

      // Verificar paginación específica
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.totalUsers).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
      expect(response.body.data.pagination.hasPrevPage).toBe(false);
    });

    test('Debería manejar búsqueda por término correctamente', async () => {
      const response = await request(app)
        .get('/api/users?search=testuser')
        .expect(200);

      // Verificar que encuentra usuarios que coincidan
      expect(response.body.data.users.length).toBeGreaterThan(0);
      
      // Verificar que todos los resultados contienen el término buscado
      const searchResults = response.body.data.users;
      const hasMatchingResults = searchResults.some(user => 
        user.username.includes('testuser') ||
        user.email.includes('testuser') ||
        user.firstName.includes('testuser') ||
        user.lastName.includes('testuser')
      );
      expect(hasMatchingResults).toBe(true);
    });

    test('Debería manejar ordenamiento correctamente', async () => {
      const response = await request(app)
        .get('/api/users?sortBy=username&sortOrder=asc')
        .expect(200);

      const users = response.body.data.users;
      
      // Verificar que están ordenados alfabéticamente por username
      for (let i = 0; i < users.length - 1; i++) {
        expect(users[i].username <= users[i + 1].username).toBe(true);
      }
    });

    test('Debería devolver array vacío cuando no hay usuarios', async () => {
      // Limpiar todos los usuarios
      await User.deleteMany({});

      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.data.users).toHaveLength(0);
      expect(response.body.data.pagination.totalUsers).toBe(0);
      expect(response.body.data.pagination.totalPages).toBe(0);
    });
  });

  /**
   * TEST 2: GET /api/users/:id - Obtener usuario por ID
   * Verifica que se puede obtener un usuario específico por su ID
   */
  describe('GET /api/users/:id - Usuario por ID', () => {
    
    test('Debería obtener usuario por ID exitosamente', async () => {
      const response = await request(app)
        .get(`/api/users/${createdUser1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.data).toHaveProperty('user');

      // Verificar datos del usuario específicos
      const user = response.body.data.user;
      expect(user._id).toBe(createdUser1._id.toString());
      expect(user.username).toBe(testUser.username);
      expect(user.email).toBe(testUser.email);
      expect(user.firstName).toBe(testUser.firstName);
      expect(user.lastName).toBe(testUser.lastName);
      expect(user.bio).toBe(testUser.bio);
      
      // Verificar que NO devuelve contraseña
      expect(user).not.toHaveProperty('password');
    });

    test('Debería devolver error 404 para ID no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/users/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Usuario no encontrado');
    });

    test('Debería devolver error 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.message).toBe('Errores de validación');
      expect(response.body).toHaveProperty('errors');
    });

    test('Debería devolver error 404 para usuario inactivo', async () => {
      // Marcar usuario como inactivo
      await User.findByIdAndUpdate(createdUser1._id, { isActive: false });

      const response = await request(app)
        .get(`/api/users/${createdUser1._id}`)
        .expect(404);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('Usuario no disponible');
    });
  });

  /**
   * TEST 3: GET /api/users/profile - Perfil de usuario autenticado
   * Verifica autenticación JWT y obtención de perfil
   */
  describe('GET /api/users/profile - Perfil autenticado', () => {
    
    let authToken;

    beforeEach(async () => {
      // Generar token JWT válido para las pruebas de autenticación
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { id: createdUser1._id },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );
    });

    test('Debería obtener perfil de usuario autenticado', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verificar estructura de respuesta
      expect(response.body).toHaveApiStructure(true);
      expect(response.body.message).toBe('Perfil obtenido exitosamente');
      expect(response.body.data).toHaveProperty('user');

      // Verificar que devuelve el usuario correcto
      const user = response.body.data.user;
      expect(user._id).toBe(createdUser1._id.toString());
      expect(user.username).toBe(testUser.username);
      expect(user.email).toBe(testUser.email);
      
      // Verificar que NO devuelve contraseña
      expect(user).not.toHaveProperty('password');
    });

    test('Debería devolver error 401 sin token de autorización', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('token de autorización');
    });

    test('Debería devolver error 401 con token inválido', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('inválido');
    });

    test('Debería devolver error 401 con token expirado', async () => {
      // Crear token expirado
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: createdUser1._id },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '-1h' } // Token expirado hace 1 hora
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveApiStructure(false);
    });

    test('Debería devolver error 401 para usuario inactivo', async () => {
      // Marcar usuario como inactivo
      await User.findByIdAndUpdate(createdUser1._id, { isActive: false });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.error).toContain('inactiva');
    });
  });

  /**
   * TEST 4: Casos límite y validación de parámetros
   * Verifica el manejo robusto de errores y casos edge
   */
  describe('Casos límite y validación', () => {
    
    test('GET /api/users debería manejar parámetros de consulta inválidos', async () => {
      const response = await request(app)
        .get('/api/users?page=invalid&limit=invalid&sortBy=invalidField')
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.message).toBe('Errores de validación');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    test('GET /api/users debería usar valores por defecto para parámetros faltantes', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      // Verificar valores por defecto
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    test('GET /api/users debería respetar límites máximos de paginación', async () => {
      const response = await request(app)
        .get('/api/users?limit=1000') // Límite muy alto
        .expect(400);

      expect(response.body).toHaveApiStructure(false);
      expect(response.body.message).toContain('validación');
    });

    test('GET /api/users debería manejar páginas fuera de rango', async () => {
      const response = await request(app)
        .get('/api/users?page=999') // Página que no existe
        .expect(200);

      // Debería devolver resultados vacíos pero no error
      expect(response.body.data.users).toHaveLength(0);
      expect(response.body.data.pagination.currentPage).toBe(999);
      expect(response.body.data.pagination.hasNextPage).toBe(false);
    });

    test('GET /api/users debería manejar búsqueda con términos vacíos', async () => {
      const response = await request(app)
        .get('/api/users?search=')
        .expect(200);

      // Búsqueda vacía debería devolver todos los usuarios
      expect(response.body.data.users).toHaveLength(2);
    });

    test('GET /api/users debería manejar búsqueda sin resultados', async () => {
      const response = await request(app)
        .get('/api/users?search=usuario-inexistente-xyz')
        .expect(200);

      // Sin resultados pero no error
      expect(response.body.data.users).toHaveLength(0);
      expect(response.body.data.pagination.totalUsers).toBe(0);
    });
  });
});