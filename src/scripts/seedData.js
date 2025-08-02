// src/scripts/seedData.js - Script para generar datos de prueba para demostración

/**
 * Este script crea datos de ejemplo en la base de datos
 * Útil para tener contenido para demostrar en el video y testing
 * 
 * Ejecutar con: node src/scripts/seedData.js
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
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
    profilePicture: 'http://localhost:3000//images/mike.jpg'
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
 * Función principal para ejecutar el seeding
 */
async function seedDatabase() {
  try {
    console.log('🌱 Iniciando proceso de seeding...');

    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');

    // Limpiar datos existentes (CUIDADO: esto elimina todos los datos)
    console.log('🧹 Limpiando datos existentes...');
    await User.deleteMany({});
    await Post.deleteMany({});
    console.log('✅ Datos existentes eliminados');

    // Crear usuarios
    console.log('👥 Creando usuarios de ejemplo...');
    const createdUsers = await User.create(sampleUsers);
    console.log(`✅ ${createdUsers.length} usuarios creados exitosamente`);

    // Mostrar usuarios creados (sin contraseñas)
    createdUsers.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (@${user.username})`);
    });

    // Crear posts
    console.log('📝 Creando posts de ejemplo...');
    const samplePosts = generateSamplePosts(createdUsers);
    const createdPosts = await Post.create(samplePosts);
    console.log(`✅ ${createdPosts.length} posts creados exitosamente`);

    // Mostrar estadísticas finales
    console.log('\n📊 Estadísticas del seeding:');
    console.log(`   - Usuarios creados: ${createdUsers.length}`);
    console.log(`   - Posts creados: ${createdPosts.length}`);
    console.log(`   - Total de registros: ${createdUsers.length + createdPosts.length}`);

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

    console.log('\n🎉 ¡Seeding completado exitosamente!');
    console.log('💡 Ahora puedes:');
    console.log('   1. Iniciar tu servidor: npm run dev');
    console.log('   2. Ir a http://localhost:3000/api-docs');
    console.log('   3. Probar los endpoints con datos reales');
    console.log('   4. Usar estos datos para tu video de demostración');

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

    console.log('✅ Base de datos limpiada exitosamente');

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
  generateSamplePosts
};