// src/controllers/userController.js - Controlador para operaciones de usuarios
const User = require('../models/User');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { generateTokens } = require('../middleware/auth');

/**
 * @desc    Registrar un nuevo usuario
 * @route   POST /api/users
 * @access  Public
 * 
 * Esta función crea un nuevo usuario en la base de datos
 * con toda la información proporcionada
 */
const createUser = asyncHandler(async (req, res) => {
  // Extraer datos del cuerpo de la petición
  const { username, email, password, firstName, lastName, profilePicture, bio } = req.body;

  // Crear nuevo usuario con los datos proporcionados
  const user = await User.create({
    username,
    email,
    password,        // Se hasheará automáticamente por el middleware pre-save
    firstName,
    lastName,
    profilePicture,
    bio
  });

  // Generar tokens de autenticación para el usuario recién creado
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Enviar respuesta exitosa con el usuario y tokens
  res.status(201).json({
    success: true,
    message: 'Usuario creado exitosamente',
    data: {
      user,                    // Los datos del usuario (sin contraseña por el toJSON del modelo)
      accessToken,             // Token para autenticación
      refreshToken             // Token para renovar el access token
    }
  });
});

/**
 * @desc    Obtener todos los usuarios
 * @route   GET /api/users
 * @access  Public (pero se puede hacer privado si se requiere)
 * 
 * Esta función devuelve una lista paginada de todos los usuarios
 * con opciones de filtrado y ordenamiento
 */
const getAllUsers = asyncHandler(async (req, res) => {
  // Extraer parámetros de consulta con valores por defecto
  const page = parseInt(req.query.page) || 1;              // Página actual (defecto: 1)
  const limit = parseInt(req.query.limit) || 10;           // Usuarios por página (defecto: 10)
  const sortBy = req.query.sortBy || 'createdAt';          // Campo de ordenamiento (defecto: fecha creación)
  const sortOrder = req.query.sortOrder || 'desc';        // Orden (defecto: descendente)
  const search = req.query.search;                         // Término de búsqueda opcional

  // Calcular el offset para la paginación
  const skip = (page - 1) * limit;

  // Crear objeto de filtros
  let filters = { isActive: true };                        // Solo usuarios activos por defecto

  // Si hay término de búsqueda, agregar filtros de búsqueda
  if (search) {
    filters.$or = [
      { username: { $regex: search, $options: 'i' } },     // Buscar en username (case insensitive)
      { firstName: { $regex: search, $options: 'i' } },    // Buscar en firstName
      { lastName: { $regex: search, $options: 'i' } },     // Buscar en lastName
      { email: { $regex: search, $options: 'i' } }         // Buscar en email
    ];
  }

  // Crear objeto de ordenamiento
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Ejecutar consulta con paginación y ordenamiento
  const users = await User.find(filters)
    .select('-password')                                   // Excluir contraseña de los resultados
    .sort(sort)                                           // Aplicar ordenamiento
    .skip(skip)                                           // Saltar registros para paginación
    .limit(limit);                                        // Limitar número de resultados

  // Contar total de usuarios que coinciden con los filtros
  const totalUsers = await User.countDocuments(filters);

  // Calcular información de paginación
  const totalPages = Math.ceil(totalUsers / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // Enviar respuesta con usuarios y metadatos de paginación
  res.status(200).json({
    success: true,
    message: 'Usuarios obtenidos exitosamente',
    data: {
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage,
        hasPrevPage,
        limit
      }
    }
  });
});

/**
 * @desc    Obtener un usuario específico por ID
 * @route   GET /api/users/:id
 * @access  Public
 * 
 * Esta función busca y devuelve un usuario específico por su ID
 */
const getUserById = asyncHandler(async (req, res) => {
  // Obtener ID del usuario desde los parámetros de la URL
  const { id } = req.params;

  // Buscar el usuario por ID excluyendo la contraseña
  const user = await User.findById(id).select('-password');

  // Verificar si el usuario existe
  if (!user) {
    throw createError('Usuario no encontrado', 404);
  }

  // Verificar si el usuario está activo
  if (!user.isActive) {
    throw createError('Usuario no disponible', 404);
  }

  // Enviar respuesta exitosa con los datos del usuario
  res.status(200).json({
    success: true,
    message: 'Usuario obtenido exitosamente',
    data: { user }
  });
});

/**
 * @desc    Actualizar un usuario
 * @route   PUT /api/users/:id
 * @access  Private (solo el propietario puede actualizar)
 * 
 * Esta función actualiza los datos de un usuario existente
 */
const updateUser = asyncHandler(async (req, res) => {
  // Obtener ID del usuario desde los parámetros
  const { id } = req.params;

  // Verificar que el usuario autenticado sea el propietario
  if (req.user._id.toString() !== id) {
    throw createError('No tienes permisos para actualizar este usuario', 403);
  }

  // Extraer campos actualizables del cuerpo de la petición
  const updateFields = {};
  const allowedFields = ['username', 'email', 'firstName', 'lastName', 'profilePicture', 'bio'];

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

  // Actualizar fecha de modificación
  updateFields.updatedAt = Date.now();

  // Actualizar el usuario en la base de datos
  const updatedUser = await User.findByIdAndUpdate(
    id,
    updateFields,
    {
      new: true,                                          // Devolver el documento actualizado
      runValidators: true                                 // Ejecutar validaciones del modelo
    }
  ).select('-password');

  // Verificar si el usuario existe
  if (!updatedUser) {
    throw createError('Usuario no encontrado', 404);
  }

  // Enviar respuesta exitosa con el usuario actualizado
  res.status(200).json({
    success: true,
    message: 'Usuario actualizado exitosamente',
    data: { user: updatedUser }
  });
});

/**
 * @desc    Eliminar (desactivar) un usuario
 * @route   DELETE /api/users/:id
 * @access  Private (solo el propietario puede eliminar)
 * 
 * Esta función "elimina" un usuario marcándolo como inactivo
 * (soft delete) en lugar de eliminarlo físicamente
 */
const deleteUser = asyncHandler(async (req, res) => {
  // Obtener ID del usuario desde los parámetros
  const { id } = req.params;

  // Verificar que el usuario autenticado sea el propietario
  if (req.user._id.toString() !== id) {
    throw createError('No tienes permisos para eliminar este usuario', 403);
  }

  // Buscar el usuario
  const user = await User.findById(id);

  // Verificar si el usuario existe
  if (!user) {
    throw createError('Usuario no encontrado', 404);
  }

  // Marcar como inactivo en lugar de eliminar físicamente
  user.isActive = false;
  user.updatedAt = Date.now();
  await user.save();

  // Enviar respuesta exitosa
  res.status(200).json({
    success: true,
    message: 'Usuario eliminado exitosamente'
  });
});

/**
 * @desc    Login de usuario
 * @route   POST /api/users/login
 * @access  Public
 * 
 * Esta función autentica a un usuario y devuelve tokens de acceso
 */
const loginUser = asyncHandler(async (req, res) => {
  // Extraer credenciales del cuerpo de la petición
  const { emailOrUsername, password } = req.body;

  // Buscar usuario por email o username
  const user = await User.findOne({
    $or: [
      { email: emailOrUsername },
      { username: emailOrUsername }
    ]
  });

  // Verificar si el usuario existe
  if (!user) {
    throw createError('Credenciales inválidas', 401);
  }

  // Verificar si el usuario está activo
  if (!user.isActive) {
    throw createError('Cuenta de usuario inactiva', 401);
  }

  // Verificar la contraseña usando el método del modelo
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw createError('Credenciales inválidas', 401);
  }

  // Actualizar último login
  await user.updateLastLogin();

  // Generar tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Enviar respuesta exitosa con usuario y tokens
  res.status(200).json({
    success: true,
    message: 'Login exitoso',
    data: {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        bio: user.bio,
        lastLogin: user.lastLogin
      },
      accessToken,
      refreshToken
    }
  });
});

/**
 * @desc    Obtener perfil del usuario autenticado
 * @route   GET /api/users/profile
 * @access  Private
 * 
 * Esta función devuelve el perfil del usuario actualmente autenticado
 */
const getUserProfile = asyncHandler(async (req, res) => {
  // El usuario viene del middleware de autenticación
  const user = req.user;

  // Enviar respuesta con el perfil del usuario
  res.status(200).json({
    success: true,
    message: 'Perfil obtenido exitosamente',
    data: { user }
  });
});

/**
 * @desc    Cambiar contraseña del usuario
 * @route   PUT /api/users/change-password
 * @access  Private
 * 
 * Esta función permite al usuario cambiar su contraseña
 */
const changePassword = asyncHandler(async (req, res) => {
  // Extraer contraseñas del cuerpo de la petición
  const { currentPassword, newPassword } = req.body;

  // Obtener el usuario completo (con contraseña) de la base de datos
  const user = await User.findById(req.user._id);

  // Verificar la contraseña actual
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);

  if (!isCurrentPasswordValid) {
    throw createError('Contraseña actual incorrecta', 400);
  }

  // Actualizar con la nueva contraseña
  user.password = newPassword;     // Se hasheará automáticamente por el middleware pre-save
  await user.save();

  // Enviar respuesta exitosa
  res.status(200).json({
    success: true,
    message: 'Contraseña cambiada exitosamente'
  });
});

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  getUserProfile,
  changePassword
};