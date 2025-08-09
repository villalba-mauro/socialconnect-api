// src/scripts/seedData.js - Script para generar datos de prueba con 4 colecciones

/**
 * Este script crea datos de ejemplo en la base de datos
 * Útil para tener contenido para demostrar en el video y testing
 * 
 * Ejecutar con: node src/scripts/seedData.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment'); // ← Asegúrate que el archivo se llame Comment.js
const Like = require('../models/Like');
require('dotenv').config();

/**
 * Datos de usuarios de ejemplo
 * Estos usuarios se crearán para demostrar la funcionalidad
 */
const sampleUsers = [
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'Password123',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Desarrollador full-stack apasionado por la tecnología. Me encanta crear aplicaciones web innovadoras.',
    profilePicture: 'http://localhost:3000/images/john.jpg'
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'Password123',
    firstName: 'Jane',
    lastName: 'Smith',
    bio: 'Diseñadora UX/UI con 5 años de experiencia. Especializada en crear experiencias digitales memorables.',
    profilePicture: 'http://localhost:3000/images/jane.jpg'
  },
  {
    username: 'mike_johnson',
    email: 'mike@example.com',
    password: 'Password123',
    firstName: 'Mike',
    lastName: 'Johnson',
    bio: 'Ingeniero de software y entusiasta de la inteligencia artificial. Siempre aprendiendo nuevas tecnologías.',
    profilePicture: 'http://localhost:3000/images/mike.jpg'
  },
  {
    username: 'sarah_wilson',
    email: 'sarah@example.com',
    password: 'Password123',
    firstName: 'Sarah',
    lastName: 'Wilson',
    bio: 'Product Manager en una startup tecnológica. Me gusta conectar la tecnología con las necesidades del usuario.',
    profilePicture: 'http://localhost:3000/images/sarah.jpg'
  },
  {
    username: 'alex_chen',
    email: 'alex@example.com',
    password: 'Password123',
    firstName: 'Alex',
    lastName: 'Chen',
    bio: 'Estudiante de Computer Science en BYU-Idaho. Interesado en desarrollo web y machine learning.',
    profilePicture: 'http://localhost:3000/images/alex.jpg'
  }
];

/**
 * Función para generar posts de ejemplo
 * Se ejecuta después de crear los usuarios para tener IDs válidos
 */
const generateSamplePosts = (users) => [
  {
    userId: users[0]._id,
    content: '¡Hola mundo! 👋 Acabo de terminar mi primera aplicación con Node.js y Express. Ha sido un viaje increíble aprendiendo sobre APIs RESTful y MongoDB.',
    tags: ['nodejs', 'javascript', 'webdev', 'beginner'],
    imageUrl: 'http://localhost:3000/images/programmer.jpg'
  },
  {
    userId: users[1]._id,
    content: 'Nuevo diseño para una app de productividad 📱✨ ¿Qué opinan sobre esta paleta de colores? Estoy tratando de crear algo limpio pero que también sea vibrante.',
    tags: ['design', 'ui', 'ux', 'productivity'],
    imageUrl: 'http://localhost:3000/images/color.jpg'
  },
  {
    userId: users[0]._id,
    content: 'Trabajando en un proyecto de machine learning para predecir tendencias de mercado. Los algoritmos de deep learning nunca dejan de sorprenderme 🤖📊',
    tags: ['machinelearning', 'ai', 'python', 'datascience']
  },
  {
    userId: users[2]._id,
    content: 'Tip del día: Siempre documenta tu código como si la persona que lo va a mantener fuera un psicópata violento que sabe dónde vives 😅 #CodingTips',
    tags: ['programming', 'tips', 'documentation', 'humor']
  },
  {
    userId: users[3]._id,
    content: 'Reflexión de producto: Los mejores features no son los más complejos, sino los que resuelven problemas reales de manera simple. La simplicidad es la sofisticación suprema 💡',
    tags: ['product', 'management', 'philosophy', 'simplicity']
  },
  {
    userId: users[1]._id,
    content: 'Proceso de diseño para el nuevo dashboard de analytics. Desde wireframes hasta el producto final. El journey de UX nunca termina! 🎨📈',
    tags: ['design', 'dashboard', 'analytics', 'process'],
    imageUrl: 'http://localhost:3000/images/dashboard.jpg'
  },
  {
    userId: users[4]._id,
    content: 'Semana de exámenes finales en BYU-I 📚⚡ Estudiando para mi examen de Algorithms & Data Structures. Las linked lists ya no me dan miedo! #StudentLife',
    tags: ['student', 'algorithms', 'datastructures', 'byui', 'finals']
  },
  {
    userId: users[2]._id,
    content: 'Implementando GraphQL en nuestro backend. La flexibilidad de queries es impresionante comparado con REST APIs tradicionales 🚀',
    tags: ['graphql', 'backend', 'api', 'technology']
  },
  {
    userId: users[3]._id,
    content: 'Lanzamos nuestra nueva feature! 🎉 Después de 3 meses de desarrollo, finalmente los usuarios pueden colaborar en tiempo real. Los números iniciales se ven prometedores.',
    tags: ['launch', 'feature', 'collaboration', 'product', 'startup']
  },
  {
    userId: users[0]._id,
    content: 'Contribución open source del día: Pull request aceptado en un proyecto de React! 💪 Es genial poder devolver algo a la comunidad que tanto me ha enseñado.',
    tags: ['opensource', 'react', 'contribution', 'community']
  },
  {
    userId: users[4]._id,
    content: 'Proyecto final del semestre: API para una red social (como esta!) 👥💻 Implementando autenticación JWT, CRUD operations, y documentación Swagger. #CSE341',
    tags: ['project', 'api', 'jwt', 'crud', 'swagger', 'school']
  },
  {
    userId: users[1]._id,
    content: 'Inspiración del día: "Design is not just what it looks like and feels like. Design is how it works." - Steve Jobs 🍎 Siempre recordando que la forma sigue a la función.',
    tags: ['inspiration', 'design', 'stevejobs', 'philosophy']
  }
];

/**
 * Función para generar comentarios de ejemplo
 * Se ejecuta después de crear posts para tener IDs válidos
 */
const generateSampleComments = (users, posts) => [
  {
    postId: posts[0]._id,
    userId: users[1]._id,
    content: "¡Excelente post! Me encanta cómo explicas Node.js 👏"
  },
  {
    postId: posts[0]._id,
    userId: users[2]._id,
    content: "Muy útil para principiantes. ¿Tienes algún tutorial recomendado?"
  },
  {
    postId: posts[1]._id,
    userId: users[0]._id,
    content: "Los colores se ven increíbles! 🎨 ¿Qué herramienta usaste?"
  },
  {
    postId: posts[1]._id,
    userId: users[3]._id,
    content: "Como PM, puedo decir que este tipo de UI mejora la experiencia del usuario"
  },
  {
    postId: posts[2]._id,
    userId: users[4]._id,
    content: "Machine learning es fascinante! Estoy estudiando algo similar en la universidad"
  },
  {
    postId: posts[3]._id,
    userId: users[1]._id,
    content: "Jajaja 😂 muy cierto! La documentación salva vidas"
  },
  {
    postId: posts[4]._id,
    userId: users[2]._id,
    content: "Totalmente de acuerdo. La simplicidad es clave en el desarrollo de productos"
  },
  {
    postId: posts[5]._id,
    userId: users[0]._id,
    content: "Ese dashboard se ve profesional! ¿Lo hiciste en Figma?"
  }
];

/**
 * Función para generar likes de ejemplo
 * Se ejecuta después de crear posts y comentarios
 */
const generateSampleLikes = (users, posts, comments) => [
  // Likes en posts
  { userId: users[0]._id, targetType: 'Post', targetId: posts[1]._id },
  { userId: users[1]._id, targetType: 'Post', targetId: posts[0]._id },
  { userId: users[2]._id, targetType: 'Post', targetId: posts[0]._id },
  { userId: users[3]._id, targetType: 'Post', targetId: posts[2]._id },
  { userId: users[4]._id, targetType: 'Post', targetId: posts[1]._id },
  { userId: users[0]._id, targetType: 'Post', targetId: posts[4]._id },
  { userId: users[1]._id, targetType: 'Post', targetId: posts[3]._id },
  { userId: users[2]._id, targetType: 'Post', targetId: posts[5]._id },
  
  // Likes en comentarios
  { userId: users[0]._id, targetType: 'Comment', targetId: comments[0]._id },
  { userId: users[2]._id, targetType: 'Comment', targetId: comments[1]._id },
  { userId: users[3]._id, targetType: 'Comment', targetId: comments[2]._id },
  { userId: users[4]._id, targetType: 'Comment', targetId: comments[3]._id },
  { userId: users[1]._id, targetType: 'Comment', targetId: comments[4]._id }
];

/**
 * Función principal para ejecutar el seeding con 4 colecciones
 */
async function seedDatabase() {
  try {
    console.log('🌱 Iniciando proceso de seeding con 4 colecciones...');

    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Limpiar datos existentes de TODAS las colecciones
    console.log('🧹 Limpiando datos existentes...');
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});  
    await Like.deleteMany({});     
    console.log('✅ Datos existentes eliminados');

    // 1. Crear usuarios
    console.log('👥 Creando usuarios de ejemplo...');
    const createdUsers = await User.create(sampleUsers);
    console.log(`✅ ${createdUsers.length} usuarios creados exitosamente`);

    // Mostrar usuarios creados (sin contraseñas)
    createdUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (@${user.username})`);
    });

    // 2. Crear posts
    console.log('📝 Creando posts de ejemplo...');
    const samplePosts = generateSamplePosts(createdUsers);
    const createdPosts = await Post.create(samplePosts);
    console.log(`✅ ${createdPosts.length} posts creados exitosamente`);

    // 3. Crear comentarios
    console.log('💬 Creando comentarios de ejemplo...');
    const sampleComments = generateSampleComments(createdUsers, createdPosts);
    const createdComments = await Comment.create(sampleComments);
    console.log(`✅ ${createdComments.length} comentarios creados exitosamente`);

    // 4. Crear likes
    console.log('❤️ Creando likes de ejemplo...');
    const sampleLikes = generateSampleLikes(createdUsers, createdPosts, createdComments);
    const createdLikes = await Like.create(sampleLikes);
    console.log(`✅ ${createdLikes.length} likes creados exitosamente`);

    // Mostrar estadísticas finales
    console.log('\n📊 Estadísticas del seeding:');
    console.log(`   - Usuarios creados: ${createdUsers.length}`);
    console.log(`   - Posts creados: ${createdPosts.length}`);
    console.log(`   - Comentarios creados: ${createdComments.length}`);
    console.log(`   - Likes creados: ${createdLikes.length}`);
    console.log(`   - Total de registros: ${createdUsers.length + createdPosts.length + createdComments.length + createdLikes.length}`);

    // Verificar que las 4 colecciones existen en MongoDB
    console.log('\n🔍 Verificando colecciones en MongoDB:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    console.log('Colecciones encontradas:', collectionNames);
    console.log('✅ users:', collectionNames.includes('users') ? 'Existe' : 'No existe');
    console.log('✅ posts:', collectionNames.includes('posts') ? 'Existe' : 'No existe');
    console.log('✅ comments:', collectionNames.includes('comments') ? 'Existe' : 'No existe');
    console.log('✅ likes:', collectionNames.includes('likes') ? 'Existe' : 'No existe');

    // Mostrar algunos datos de ejemplo para verificación
    console.log('\n🔍 Datos de verificación:');
    console.log('Primer usuario:', {
      id: createdUsers[0]._id,
      username: createdUsers[0].username,
      email: createdUsers[0].email
    });
    console.log('Primer post:', {
      id: createdPosts[0]._id,
      author: createdUsers[0].username,
      content: createdPosts[0].content.substring(0, 50) + '...'
    });
    console.log('Primer comentario:', {
      id: createdComments[0]._id,
      content: createdComments[0].content.substring(0, 30) + '...',
      postId: createdComments[0].postId
    });
    console.log('Primer like:', {
      id: createdLikes[0]._id,
      targetType: createdLikes[0].targetType,
      targetId: createdLikes[0].targetId
    });

    console.log('\n🎉 ¡Seeding completado exitosamente con 4 colecciones!');
    
    
    console.log('  Ir a http://localhost:3000/api-docs');

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    
    // Mostrar detalles específicos del error
    if (error.name === 'ValidationError') {
      console.error('Error de validación:', error.message);
      Object.keys(error.errors).forEach(field => {
        console.error(`   - ${field}: ${error.errors[field].message}`);
      });
    } else if (error.code === 11000) {
      console.error('Error de duplicado - algunos datos ya existen');
    } else {
      console.error('Error detallado:', error.message);
    }

  } finally {
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
}

/**
 * Función para limpiar solo los datos (sin crear nuevos)
 */
async function cleanDatabase() {
  try {
    console.log('🧹 Limpiando base de datos...');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});  
    await Like.deleteMany({});     

    console.log('✅ Base de datos limpiada exitosamente (4 colecciones)');

  } catch (error) {
    console.error('❌ Error al limpiar base de datos:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Ejecutar función basada en argumentos de línea de comandos
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'clean') {
    cleanDatabase();
  } else {
    seedDatabase();
  }
}

module.exports = {
  seedDatabase,
  cleanDatabase,
  sampleUsers,
  generateSamplePosts,
  generateSampleComments,
  generateSampleLikes
};