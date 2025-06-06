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

// Função para criar as tabelas necessárias
async function createTables() {
  try {
    // Criar tabela de carrinhos se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS carrinhos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        proposito TEXT,
        id_usuario INT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
      )
    `);

    // Criar tabela de produtos no carrinho se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS carrinho_produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_carrinho INT NOT NULL,
        id_produto INT NOT NULL,
        quantidade INT NOT NULL DEFAULT 1,
        FOREIGN KEY (id_carrinho) REFERENCES carrinhos(id) ON DELETE CASCADE,
        FOREIGN KEY (id_produto) REFERENCES produtos(id),
        UNIQUE KEY unique_cart_product (id_carrinho, id_produto)
      )
    `);

    console.log('Tabelas verificadas/criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  }
}

// Testa a conexão e cria as tabelas
pool.getConnection()
  .then(async connection => {
    console.log('Conectado ao banco de dados MySQL com sucesso!');
    connection.release(); // Libera a conexão de volta para o pool
    await createTables();
  })
  .catch(err => {
    console.error('Erro ao conectar com o banco de dados MySQL:', err.stack);
    // Se não conseguir conectar, pode ser útil encerrar o processo
    // process.exit(1); // Descomente se quiser que o app pare se não conectar
  });

module.exports = pool; // Exporta o pool para ser usado em outros arquivos