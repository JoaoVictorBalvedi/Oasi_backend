// oasi-backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dbPool = require('./db');

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ... (rotas existentes: /api, /api/products GET, /api/users/:id GET e PUT) ...

// Rota para buscar todos os produtos (já existente)
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM produtos');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ message: 'Erro ao buscar produtos do banco de dados.' });
  }
});


// NOVO: Rota para CADASTRAR um novo produto
app.post('/api/products', async (req, res) => {
  // Para a aula, vamos assumir que id_vendedor virá no corpo da requisição.
  // Em um sistema real, isso viria do usuário logado.
  const { nome, preco, nivel_sustentabilidade, descricao, imagem_url, id_vendedor } = req.body;

  if (!nome || preco === undefined || !id_vendedor) {
    return res.status(400).json({ message: 'Nome, preço e ID do vendedor são obrigatórios.' });
  }
  if (isNaN(parseFloat(preco)) || parseFloat(preco) < 0) {
    return res.status(400).json({ message: 'Preço inválido.' });
  }

  try {
    const [result] = await dbPool.query(
      'INSERT INTO produtos (nome, preco, nivel_sustentabilidade, descricao, imagem_url, id_vendedor) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, parseFloat(preco), nivel_sustentabilidade, descricao, imagem_url, id_vendedor]
    );
    // O 'result.insertId' contém o ID do produto recém-criado
    res.status(201).json({ message: 'Produto cadastrado com sucesso!', id: result.insertId, nome, preco, id_vendedor });
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error);
    res.status(500).json({ message: 'Erro ao cadastrar produto.' });
  }
});

// NOVO: Rota para buscar produtos de UM VENDEDOR específico
app.get('/api/users/:userId/products', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await dbPool.query('SELECT * FROM produtos WHERE id_vendedor = ? ORDER BY criado_em DESC', [userId]);
    res.json(rows);
  } catch (error) {
    console.error(`Erro ao buscar produtos do vendedor ${userId}:`, error);
    res.status(500).json({ message: 'Erro ao buscar produtos do vendedor.' });
  }
});


// Rota para buscar um usuário específico por ID (já existente)
app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await dbPool.query('SELECT id, nome, email, telefone FROM usuarios WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(`Erro ao buscar usuário ${userId}:`, error);
    res.status(500).json({ message: 'Erro ao buscar dados do usuário.' });
  }
});

// Rota para buscar TODOS OS CARRINHOS de UM USUÁRIO específico
app.get('/api/users/:userId/carts', async (req, res) => {
    const { userId } = req.params;
    try {
      // Buscamos os carrinhos do usuário, ordenados pelo mais recente
      // No futuro, poderíamos adicionar contagem de itens ou valor total aqui com um JOIN ou subquery.
      const [rows] = await dbPool.query(
        'SELECT id, nome, proposito, criado_em FROM carrinhos WHERE id_usuario = ? ORDER BY criado_em DESC',
        [userId]
      );
      res.json(rows);
    } catch (error) {
      console.error(`Erro ao buscar carrinhos do usuário ${userId}:`, error);
      res.status(500).json({ message: 'Erro ao buscar carrinhos do usuário.' });
    }
  });

// Rota para atualizar um usuário específico por ID (já existente)
app.put('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { nome, email, telefone } = req.body; 

  if (!nome || !email) {
    return res.status(400).json({ message: 'Nome e email são obrigatórios.' });
  }

  try {
    const [result] = await dbPool.query(
      'UPDATE usuarios SET nome = ?, email = ?, telefone = ? WHERE id = ?',
      [nome, email, telefone, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado para atualização.' });
    }
    res.json({ message: 'Dados do usuário atualizados com sucesso!', id: userId, nome, email, telefone });
  } catch (error) {
    console.error(`Erro ao atualizar usuário ${userId}:`, error);
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Este email já está em uso por outra conta.' });
    }
    res.status(500).json({ message: 'Erro ao atualizar dados do usuário.' });
  }
});

app.get('/api/carts/:cartId/products-details', async (req, res) => {
    const { cartId } = req.params;
    try {
      // Query para buscar produtos em um carrinho, incluindo detalhes do produto e a quantidade
      const [rows] = await dbPool.query(
        `SELECT 
           p.id, 
           p.nome, 
           p.preco, 
           p.imagem_url, 
           cp.quantidade 
         FROM carrinho_produtos cp
         JOIN produtos p ON cp.id_produto = p.id
         WHERE cp.id_carrinho = ?`,
        [cartId]
      );
      if (rows.length === 0) {
        // Ainda retorna um array vazio se o carrinho estiver vazio, o que é ok.
        // Poderia adicionar uma checagem se o carrinho em si existe, se desejado.
      }
      res.json(rows);
    } catch (error) {
      console.error(`Erro ao buscar produtos detalhados do carrinho ${cartId}:`, error);
      res.status(500).json({ message: 'Erro ao buscar produtos do carrinho.' });
    }
  });

app.post('/api/carts/:cartId/products', async (req, res) => {
    const { cartId } = req.params; // ID do carrinho
    const { produto_id, quantidade = 1 } = req.body; // ID do produto e quantidade (default 1)
  
    if (!produto_id || !cartId) {
      return res.status(400).json({ message: 'ID do carrinho e ID do produto são obrigatórios.' });
    }
    if (isNaN(parseInt(quantidade)) || parseInt(quantidade) <= 0) {
      return res.status(400).json({ message: 'Quantidade inválida.' });
    }
  
    const conn = await dbPool.getConnection(); // Pega uma conexão do pool para usar transação
  
    try {
      await conn.beginTransaction(); // Inicia a transação
  
      // Passo 1: Verificar se o carrinho pertence ao usuário (simulando usuário ID 1)
      // Em um sistema real, você verificaria o ID do usuário logado.
      // Por agora, vamos assumir que o cartId fornecido é válido para o usuário 1.
      // Poderíamos adicionar uma verificação:
      /*
      const [cartRows] = await conn.query('SELECT id_usuario FROM carrinhos WHERE id = ?', [cartId]);
      if (cartRows.length === 0 || cartRows[0].id_usuario !== 1) { // Supondo usuário logado é 1
          await conn.rollback();
          conn.release();
          return res.status(403).json({ message: 'Carrinho não pertence ao usuário ou não existe.' });
      }
      */
  
      // Passo 2: Verificar se o produto já existe no carrinho_produtos para este carrinho
      const [existingEntry] = await conn.query(
        'SELECT quantidade FROM carrinho_produtos WHERE id_carrinho = ? AND id_produto = ?',
        [cartId, produto_id]
      );
  
      if (existingEntry.length > 0) {
        // Produto já existe, então atualiza a quantidade
        const novaQuantidade = existingEntry[0].quantidade + parseInt(quantidade);
        await conn.query(
          'UPDATE carrinho_produtos SET quantidade = ? WHERE id_carrinho = ? AND id_produto = ?',
          [novaQuantidade, cartId, produto_id]
        );
        await conn.commit(); // Finaliza a transação
        res.json({ message: 'Quantidade do produto atualizada no carrinho!', id_carrinho: cartId, id_produto: produto_id, quantidade: novaQuantidade });
      } else {
        // Produto não existe, então insere
        await conn.query(
          'INSERT INTO carrinho_produtos (id_carrinho, id_produto, quantidade) VALUES (?, ?, ?)',
          [cartId, produto_id, parseInt(quantidade)]
        );
        await conn.commit(); // Finaliza a transação
        res.status(201).json({ message: 'Produto adicionado ao carrinho com sucesso!', id_carrinho: cartId, id_produto: produto_id, quantidade: parseInt(quantidade) });
      }
    } catch (error) {
      await conn.rollback(); // Desfaz a transação em caso de erro
      console.error(`Erro ao adicionar produto ${produto_id} ao carrinho ${cartId}:`, error);
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_NO_REFERENCED_ROW') {
          // Este erro acontece se o produto_id ou cartId não existem nas tabelas produtos/carrinhos
          return res.status(404).json({ message: 'Produto ou Carrinho não encontrado.'});
      }
      res.status(500).json({ message: 'Erro ao adicionar produto ao carrinho.' });
    } finally {
      if (conn) conn.release(); // Libera a conexão de volta para o pool
    }
  });


app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
  // ... outras mensagens de log ...
  console.log(`Para cadastrar produto (POST): http://localhost:${PORT}/api/products`);
  console.log(`Para ver produtos do usuário 1 (GET): http://localhost:${PORT}/api/users/1/products`);
});