const dbPool = require('./db');

async function migrate() {
  const conn = await dbPool.getConnection();
  try {
    await conn.beginTransaction();

    // Primeiro, vamos fazer backup dos dados existentes
    const [carrinhos] = await conn.query('SELECT * FROM carrinhos');
    
    // Drop a tabela carrinho_produtos primeiro (por causa da foreign key)
    await conn.query('DROP TABLE IF EXISTS carrinho_produtos');
    
    // Drop a tabela carrinhos
    await conn.query('DROP TABLE IF EXISTS carrinhos');
    
    // Recria a tabela carrinhos sem o ON DELETE CASCADE
    await conn.query(`
      CREATE TABLE carrinhos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        nome VARCHAR(255) NOT NULL,
        proposito TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
      ) ENGINE=InnoDB
    `);
    
    // Recria a tabela carrinho_produtos
    await conn.query(`
      CREATE TABLE carrinho_produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_carrinho INT NOT NULL,
        id_produto INT NOT NULL,
        quantidade INT NOT NULL DEFAULT 1,
        FOREIGN KEY (id_carrinho) REFERENCES carrinhos(id),
        FOREIGN KEY (id_produto) REFERENCES produtos(id),
        UNIQUE KEY unique_cart_product (id_carrinho, id_produto)
      ) ENGINE=InnoDB
    `);
    
    // Restaura os dados dos carrinhos
    for (const carrinho of carrinhos) {
      await conn.query(
        'INSERT INTO carrinhos (id, id_usuario, nome, proposito, criado_em) VALUES (?, ?, ?, ?, ?)',
        [carrinho.id, carrinho.id_usuario, carrinho.nome, carrinho.proposito, carrinho.criado_em]
      );
    }

    await conn.commit();
    console.log('Migration completed successfully!');
  } catch (error) {
    await conn.rollback();
    console.error('Migration failed:', error);
  } finally {
    conn.release();
  }
}

migrate(); 