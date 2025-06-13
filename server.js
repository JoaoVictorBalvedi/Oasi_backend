// oasi-backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// Rota para buscar um produto específico por ID
app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const [rows] = await dbPool.query('SELECT * FROM produtos WHERE id = ?', [productId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(`Erro ao buscar produto ${productId}:`, error);
    res.status(500).json({ message: 'Erro ao buscar dados do produto.' });
  }
});

// Rota para REGISTRAR um novo usuário
app.post('/api/auth/register', async (req, res) => {
  const { nome, email, senha, telefone } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    // 1. Verificar se o email já existe
    const [userExists] = await dbPool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (userExists.length > 0) {
      return res.status(409).json({ message: 'Este email já está cadastrado.' });
    }

    // 2. Criar o hash da senha
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    // 3. Inserir o novo usuário no banco de dados
    const [result] = await dbPool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, telefone) VALUES (?, ?, ?, ?)',
      [nome, email, senha_hash, telefone]
    );

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!', userId: result.insertId });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário.' });
  }
});


// Rota para LOGAR um usuário
app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }

  try {
    // 1. Encontrar o usuário pelo email
    const [users] = await dbPool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas.' }); // Mensagem genérica por segurança
    }
    const user = users[0];

    // 2. Comparar a senha fornecida com o hash salvo no banco
    const isMatch = await bcrypt.compare(senha, user.senha_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas.' }); // Mensagem genérica
    }

    // 3. Se a senha estiver correta, criar o token JWT
    const payload = {
      userId: user.id,
      nome: user.nome,
      // Não inclua informações sensíveis no payload
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d' // Token expira em 1 dia (ex: '1h', '7d')
    });

    // 4. Enviar o token e os dados básicos do usuário para o frontend
    res.json({
      message: 'Login bem-sucedido!',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro ao fazer login.' });
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
      // Garantimos que todos os carrinhos sejam retornados, mesmo os vazios
      const [rows] = await dbPool.query(
        `SELECT c.id, c.nome, c.proposito, c.criado_em 
         FROM carrinhos c 
         WHERE c.id_usuario = ? 
         ORDER BY c.criado_em DESC`,
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
      // Primeiro, verifica se o carrinho existe
      const [cartRows] = await dbPool.query('SELECT id FROM carrinhos WHERE id = ?', [cartId]);
      if (cartRows.length === 0) {
        return res.status(404).json({ message: 'Carrinho não encontrado.' });
      }

      // Se o carrinho existe, busca os produtos
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

// Rota para CRIAR um novo carrinho
app.post('/api/carts', async (req, res) => {
  const { nome, proposito, id_usuario } = req.body;

  if (!nome || !id_usuario) {
    return res.status(400).json({ message: 'Nome do carrinho e ID do usuário são obrigatórios.' });
  }

  try {
    const [result] = await dbPool.query(
      'INSERT INTO carrinhos (nome, proposito, id_usuario) VALUES (?, ?, ?)',
      [nome, proposito, id_usuario]
    );

    res.status(201).json({
      message: 'Carrinho criado com sucesso!',
      id: result.insertId,
      nome,
      proposito,
      id_usuario
    });
  } catch (error) {
    console.error('Erro ao criar carrinho:', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    res.status(500).json({ message: 'Erro ao criar carrinho.' });
  }
});

// Rota para atualizar a quantidade de um produto no carrinho
app.put('/api/carts/:cartId/products/:productId', async (req, res) => {
  const { cartId, productId } = req.params;
  const { quantidade } = req.body;

  if (!quantidade || isNaN(parseInt(quantidade)) || parseInt(quantidade) <= 0) {
    return res.status(400).json({ message: 'Quantidade inválida.' });
  }

  const conn = await dbPool.getConnection();

  try {
    await conn.beginTransaction();

    // Verifica se o produto existe no carrinho
    const [existingEntry] = await conn.query(
      'SELECT quantidade FROM carrinho_produtos WHERE id_carrinho = ? AND id_produto = ?',
      [cartId, productId]
    );

    if (existingEntry.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Produto não encontrado no carrinho.' });
    }

    // Atualiza a quantidade
    await conn.query(
      'UPDATE carrinho_produtos SET quantidade = ? WHERE id_carrinho = ? AND id_produto = ?',
      [parseInt(quantidade), cartId, productId]
    );

    await conn.commit();
    res.json({ 
      message: 'Quantidade atualizada com sucesso!', 
      id_carrinho: cartId, 
      id_produto: productId, 
      quantidade: parseInt(quantidade) 
    });
  } catch (error) {
    await conn.rollback();
    console.error(`Erro ao atualizar quantidade do produto ${productId} no carrinho ${cartId}:`, error);
    res.status(500).json({ message: 'Erro ao atualizar quantidade do produto.' });
  } finally {
    if (conn) conn.release();
  }
});

// Rota para remover um produto do carrinho
app.delete('/api/carts/:cartId/products/:productId', async (req, res) => {
  const { cartId, productId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido.' });
  }

  const conn = await dbPool.getConnection();

  try {
    // Verifica o token e obtém o ID do usuário
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    await conn.beginTransaction();

    // Verifica se o carrinho pertence ao usuário
    const [cartRows] = await conn.query(
      'SELECT id, id_usuario FROM carrinhos WHERE id = ?',
      [cartId]
    );

    if (cartRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Carrinho não encontrado.' });
    }

    if (cartRows[0].id_usuario !== userId) {
      await conn.rollback();
      return res.status(403).json({ message: 'Carrinho não pertence ao usuário.' });
    }

    // Verifica se o produto existe no carrinho
    const [existingEntry] = await conn.query(
      'SELECT quantidade FROM carrinho_produtos WHERE id_carrinho = ? AND id_produto = ?',
      [cartId, productId]
    );

    if (existingEntry.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Produto não encontrado no carrinho.' });
    }

    // Remove o produto do carrinho
    await conn.query(
      'DELETE FROM carrinho_produtos WHERE id_carrinho = ? AND id_produto = ?',
      [cartId, productId]
    );

    // Busca os produtos restantes no carrinho
    const [remainingProducts] = await conn.query(
      'SELECT COUNT(*) as count FROM carrinho_produtos WHERE id_carrinho = ?',
      [cartId]
    );

    await conn.commit();

    res.json({ 
      message: 'Produto removido do carrinho com sucesso!', 
      id_carrinho: cartId, 
      id_produto: productId,
      produtos_restantes: remainingProducts[0].count
    });
  } catch (error) {
    await conn.rollback();
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido.' });
    }
    console.error(`Erro ao remover produto ${productId} do carrinho ${cartId}:`, error);
    res.status(500).json({ message: 'Erro ao remover produto do carrinho.' });
  } finally {
    if (conn) conn.release();
  }
});

// Rotas de comentários de produtos
app.get('/api/products/:id/comentarios', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await dbPool.query(
      `SELECT c.*, u.nome as usuario_nome FROM comentarios c JOIN usuarios u ON c.id_usuario = u.id WHERE c.id_produto = ? ORDER BY c.data DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ message: 'Erro ao buscar comentários.' });
  }
});

app.post('/api/products/:id/comentarios', async (req, res) => {
  const { id } = req.params;
  const { id_usuario, texto } = req.body;
  if (!id_usuario || !texto) return res.status(400).json({ message: 'Usuário e texto obrigatórios.' });
  try {
    await dbPool.query(
      `INSERT INTO comentarios (id_produto, id_usuario, texto) VALUES (?, ?, ?)`,
      [id, id_usuario, texto]
    );
    res.json({ message: 'Comentário adicionado com sucesso!' });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({ message: 'Erro ao adicionar comentário.' });
  }
});

// Rotas de eventos
app.get('/api/eventos', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM eventos ORDER BY data ASC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
    res.status(500).json({ message: 'Erro ao buscar eventos.' });
  }
});

app.get('/api/eventos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await dbPool.query('SELECT * FROM eventos WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Evento não encontrado.' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar evento:', error);
    res.status(500).json({ message: 'Erro ao buscar evento.' });
  }
});

// Chat do evento
app.get('/api/eventos/:id/mensagens', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await dbPool.query(
      `SELECT m.*, u.nome as usuario_nome FROM evento_mensagens m JOIN usuarios u ON m.id_usuario = u.id WHERE m.id_evento = ? ORDER BY m.data ASC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar mensagens do evento:', error);
    res.status(500).json({ message: 'Erro ao buscar mensagens.' });
  }
});

app.post('/api/eventos/:id/mensagens', async (req, res) => {
  const { id } = req.params;
  const { id_usuario, texto } = req.body;
  if (!id_usuario || !texto) return res.status(400).json({ message: 'Usuário e texto obrigatórios.' });
  try {
    await dbPool.query(
      `INSERT INTO evento_mensagens (id_evento, id_usuario, texto) VALUES (?, ?, ?)`,
      [id, id_usuario, texto]
    );
    res.json({ message: 'Mensagem enviada com sucesso!' });
  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error);
    res.status(500).json({ message: 'Erro ao adicionar mensagem.' });
  }
});

// Rota para criar novo evento
app.post('/api/eventos', async (req, res) => {
  const { nome, data, local, descricao } = req.body;
  if (!nome || !data || !local || !descricao) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  try {
    await dbPool.query(
      'INSERT INTO eventos (nome, data, local, descricao) VALUES (?, ?, ?, ?)',
      [nome, data, local, descricao]
    );
    res.json({ message: 'Evento criado com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({ message: 'Erro ao criar evento.' });
  }
});

// Editar produto
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, preco, nivel_sustentabilidade, descricao, imagem_url } = req.body;
  if (!nome || preco === undefined) {
    return res.status(400).json({ message: 'Nome e preço são obrigatórios.' });
  }
  try {
    await dbPool.query(
      'UPDATE produtos SET nome = ?, preco = ?, nivel_sustentabilidade = ?, descricao = ?, imagem_url = ? WHERE id = ?',
      [nome, preco, nivel_sustentabilidade, descricao, imagem_url, id]
    );
    res.json({ message: 'Produto atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao editar produto:', error);
    res.status(500).json({ message: 'Erro ao editar produto.' });
  }
});

// Remover produto
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbPool.query('DELETE FROM produtos WHERE id = ?', [id]);
    res.json({ message: 'Produto removido com sucesso!' });
  } catch (error) {
    console.error('Erro ao remover produto:', error);
    res.status(500).json({ message: 'Erro ao remover produto.' });
  }
});

// Rota para buscar dados de sustentabilidade do usuário
app.get('/api/users/:id/sustentabilidade', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await dbPool.query('SELECT arvores_plantadas, pontos_verdes, impacto_kg_co2 FROM usuarios WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar sustentabilidade:', error);
    res.status(500).json({ message: 'Erro ao buscar dados de sustentabilidade.' });
  }
});

// Rota para plantar árvore (incrementa árvores, pontos e impacto)
app.post('/api/users/:id/plantar-arvore', async (req, res) => {
  const { id } = req.params;
  try {
    // Para cada árvore, soma 10 pontos e 2kg de CO2 economizados (exemplo)
    await dbPool.query('UPDATE usuarios SET arvores_plantadas = arvores_plantadas + 1, pontos_verdes = pontos_verdes + 10, impacto_kg_co2 = impacto_kg_co2 + 2 WHERE id = ?', [id]);
    res.json({ message: 'Árvore plantada! Pontos e impacto atualizados.' });
  } catch (error) {
    console.error('Erro ao plantar árvore:', error);
    res.status(500).json({ message: 'Erro ao plantar árvore.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
  // ... outras mensagens de log ...
  console.log(`Para cadastrar produto (POST): http://localhost:${PORT}/api/products`);
  console.log(`Para ver produtos do usuário 1 (GET): http://localhost:${PORT}/api/users/1/products`);
});