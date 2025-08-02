// src/tests/user.test.js - Tests unitarios para rutas GET de usuarios
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server'); // Importar la aplicación Express
const User = require('../models/User');

/**
 * Configuración de la base de datos de pruebas
 * Antes de ejecutar los tests, se conecta a una base de datos de prueba
 * Después de cada test, se limpian los datos
 * Al finalizar, se cierra la conexión
 */

// Configurar base de datos de pruebas
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/socialconnect_test';

// Datos de prueba para usar en los tests
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

// Variable para almacenar usuarios creados durante los tests
let createdUser1;
let createdUser2;

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
  
  // Crear usuarios de prueba
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
});

/**
 * Suite de tests para rutas GET de usuarios
 */
describe('User GET Routes', () => {
  
  /**
   * Tests para GET /api/users
   * Esta ruta obtiene la lista de todos los usuarios con paginación
   */
  describe('GET /api/users', () => {
    
    test('Debería obtener lista de usuarios exitosamente', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('pagination');

      // Verificar que devuelve los usuarios creados
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.users[0]).toHaveProperty('username');
      expect(response.body.data.users[0]).toHaveProperty('email');
      
      // Verificar que no devuelve contraseñas
      expect(response.body.data.users[0]).not.toHaveProperty('password');
    });

    test('Debería manejar paginación correctamente', async () => {
      const response = await request(app)
        .get('/api/users?page=1&limit=1')
        .expect(200);

      // Verificar paginación
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.totalUsers).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    test('Debería manejar búsqueda por término', async () => {
      const response = await request(app)
        .get('/api/users?search=testuser')
        .expect(200);

      // Verificar que encuentra usuarios que coincidan
      expect(response.body.data.users.length).toBeGreaterThan(0);
      
      // Verificar que el resultado contiene el término buscado
      const foundUser = response.body.data.users.find(user => 
        user.username.includes('testuser')
      );
      expect(foundUser).toBeDefined();
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
    });
  });

  /**
   * Tests para GET /api/users/:id
   * Esta ruta obtiene un usuario específico por su ID
   */
  describe('GET /api/users/:id', () => {
    
    test('Debería obtener usuario por ID exitosamente', async () => {
      const response = await request(app)
        .get(`/api/users/${createdUser1._id}`)
        .expect(200);

      // Verificar estructura de la respuesta
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('user');

      // Verificar datos del usuario
      const user = response.body.data.user;
      expect(user.username).toBe(testUser.username);
      expect(user.email).toBe(testUser.email);
      expect(user.firstName).toBe(testUser.firstName);
      expect(user.lastName).toBe(testUser.lastName);
      
      // Verificar que no devuelve contraseña
      expect(user).not.toHaveProperty('password');
    });

    test('Debería devolver error 404 para ID no existente', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/users/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Usuario no encontrado');
    });

    test('Debería devolver error 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Errores de validación');
    });

    test('Debería devolver error 404 para usuario inactivo', async () => {
      // Marcar usuario como inactivo
      await User.findByIdAndUpdate(createdUser1._id, { isActive: false });

      const response = await request(app)
        .get(`/api/users/${createdUser1._id}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Usuario no disponible');
    });
  });

  /**
   * Tests para GET /api/users/profile
   * Esta ruta requiere autenticación, por lo que necesitamos generar un token
   */
  describe('GET /api/users/profile', () => {
    
    let authToken;

    beforeEach(async () => {
      // Generar token de autenticación para las pruebas
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

      // Verificar estructura de la respuesta
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Perfil obtenido exitosamente');
      expect(response.body.data).toHaveProperty('user');

      // Verificar que devuelve el usuario correcto
      const user = response.body.data.user;
      expect(user._id).toBe(createdUser1._id.toString());
      expect(user.username).toBe(testUser.username);
      expect(user.email).toBe(testUser.email);
      
      // Verificar que no devuelve contraseña
      expect(user).not.toHaveProperty('password');
    });

    test('Debería devolver error 401 sin token de autorización', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token de autorización');
    });

    test('Debería devolver error 401 con token inválido', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('Debería devolver error 401 para usuario inactivo', async () => {
      // Marcar usuario como inactivo
      await User.findByIdAndUpdate(createdUser1._id, { isActive: false });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('inactiva');
    });
  });

  /**
   * Tests adicionales para edge cases y manejo de errores
   */
  describe('Edge Cases y Manejo de Errores', () => {
    
    test('GET /api/users debería manejar parámetros de consulta inválidos', async () => {
      const response = await request(app)
        .get('/api/users?page=invalid&limit=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message', 'Errores de validación');
    });

    test('GET /api/users debería usar valores por defecto para parámetros faltantes', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      // Verificar que usa valores por defecto
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    test('GET /api/users debería manejar límites de paginación', async () => {
      const response = await request(app)
        .get('/api/users?limit=1000') // Límite muy alto
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('validación');
    });
  });
});