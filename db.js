// oasi-backend/db.js
const mysql = require('mysql2/promise'); // Usando a versão com Promise
require('dotenv').config(); // Carrega as variáveis do .env

// Cria um "pool" de conexões. É mais eficiente que criar uma nova conexão para cada query.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Número máximo de conexões no pool
  queueLimit: 0
});

// Testa a conexão (opcional, mas bom para verificar)
pool.getConnection()
  .then(connection => {
    console.log('Conectado ao banco de dados MySQL com sucesso!');
    connection.release(); // Libera a conexão de volta para o pool
  })
  .catch(err => {
    console.error('Erro ao conectar com o banco de dados MySQL:', err.stack);
    // Se não conseguir conectar, pode ser útil encerrar o processo
    // process.exit(1); // Descomente se quiser que o app pare se não conectar
  });

module.exports = pool; // Exporta o pool para ser usado em outros arquivos