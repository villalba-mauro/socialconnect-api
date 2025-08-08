// debug-env.js - Script para verificar variables de entorno
console.log('🔍 DEBUGGING VARIABLES DE ENTORNO');
console.log('=====================================');

// 1. Verificar si dotenv está instalado
try {
  require('dotenv').config();
  console.log('✅ dotenv cargado correctamente');
} catch (error) {
  console.log('❌ Error cargando dotenv:', error.message);
  console.log('💡 Instala dotenv con: npm install dotenv');
}

// 2. Verificar ubicación del archivo .env
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
console.log('📍 Buscando .env en:', envPath);

if (fs.existsSync(envPath)) {
  console.log('✅ Archivo .env encontrado');
  
  // Leer contenido del archivo .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  console.log('📄 Contenido del .env:');
  lines.forEach((line, index) => {
    const [key] = line.split('=');
    console.log(`   ${index + 1}. ${key}=***`);
  });
  
} else {
  console.log('❌ Archivo .env NO encontrado');
  console.log('💡 Crea el archivo .env en la raíz del proyecto');
}

// 3. Verificar variables específicas
console.log('\n🔑 VARIABLES DE ENTORNO OAUTH:');
console.log('=====================================');

const oauthVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'MONGODB_URI',
  'JWT_SECRET',
  'SESSION_SECRET'
];

oauthVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${varName}: undefined`);
  }
});

// 4. Mostrar todas las variables que empiecen con GOOGLE_ o GITHUB_
console.log('\n🌐 TODAS LAS VARIABLES OAUTH:');
console.log('=====================================');

Object.keys(process.env)
  .filter(key => key.startsWith('GOOGLE_') || key.startsWith('GITHUB_') || key.startsWith('MONGODB_') || key.startsWith('JWT_'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key] ? '✅ Definida' : '❌ Undefined'}`);
  });

// 5. Verificar directorio actual
console.log('\n📂 INFORMACIÓN DEL DIRECTORIO:');
console.log('=====================================');
console.log('Directorio actual:', process.cwd());
console.log('Archivo ejecutado desde:', __dirname);

// 6. Listar archivos en el directorio raíz
const rootFiles = fs.readdirSync(process.cwd());
console.log('Archivos en la raíz:');
rootFiles.forEach(file => {
  if (file.startsWith('.env')) {
    console.log(`   ✅ ${file}`);
  }
});

console.log('\n=====================================');
console.log('🎯 DIAGNÓSTICO COMPLETADO');
console.log('=====================================');