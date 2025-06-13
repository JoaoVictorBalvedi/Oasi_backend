CREATE DATABASE oasi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE oasi_db;
SELECT USER();
select * from oasi_db.usuarios;
select * from oasi_db.produtos;
select * from oasi_db.carrinho_produtos;
select * from oasi_db.carrinhos;
select * from oasi_db.comentarios;
select * from oasi_db.eventos;
select * from oasi_db.evento_mensagens;
INSERT INTO usuarios (id, nome, email, telefone) VALUES (1, 'Usuário Teste', 'teste@oasi.com', '99999-8888');
INSERT INTO carrinhos (id_usuario, nome, proposito) VALUES (2, 'Compras de Supermercado Semanais', 'Itens essenciais para casa');
INSERT INTO carrinhos (id_usuario, nome, proposito) VALUES (1, 'Presentes de Aniversário - Maria', 'Comprar presentes para a festa da Maria');
INSERT INTO produtos (id_vendedor, nome, preco, nivel_sustentabilidade, descricao, imagem_url) VALUES
(1, 'Ecobag de Algodão Orgânico', 45.90, 5, 'Sacola reutilizável feita de 100% algodão orgânico certificado, perfeita para suas compras.', '/images/ecobag-algodao.jpg'),
(1, 'Kit Escovas de Dente de Bambu (4un)', 29.90, 4, 'Conjunto com 4 escovas de dente biodegradáveis feitas com cabo de bambu e cerdas macias sem BPA.', '/images/kit-escovas-bambu.jpg'),
(1, 'Garrafa Térmica Inox Sustentável', 89.00, 4, 'Garrafa térmica de aço inoxidável, mantém sua bebida quente por 12h ou fria por 24h. Livre de BPA.', '/images/garrafa-inox.jpg'),
(1, 'Canudos de Inox Reutilizáveis (Kit)', 19.50, 5, 'Kit com 4 canudos de inox (2 retos, 2 curvados), escovinha de limpeza e bolsa de transporte.', '/images/canudos-inox.jpg'),
(1, 'Vaso Auto Irrigável Pequeno', 35.00, 3, 'Vaso pequeno com sistema auto irrigável, ideal para temperos e pequenas plantas, feito com plástico reciclado.', '/images/vaso-autoirrigavel.jpg'),
(1, 'Caderno Ecológico Reciclado', 22.00, 4, 'Caderno de anotações com capa e folhas feitas de papel reciclado. 80 folhas.', '/images/caderno-reciclado.jpg');
-- Tabela de Usuários

CREATE TABLE eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    data DATETIME NOT NULL,
    local VARCHAR(255) NOT NULL,
    descricao TEXT
);

CREATE TABLE evento_mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_evento INT NOT NULL,
    id_usuario INT NOT NULL,
    texto TEXT NOT NULL,
    data DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_evento) REFERENCES eventos(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

CREATE TABLE comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_produto INT NOT NULL,
    id_usuario INT NOT NULL,
    texto TEXT NOT NULL,
    data DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_produto) REFERENCES produtos(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(50),
    -- senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
ALTER TABLE usuarios ADD COLUMN senha_hash VARCHAR(255) NOT NULL;
ALTER TABLE usuarios ADD COLUMN arvores_plantadas INT DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN pontos_verdes INT DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN impacto_kg_co2 DECIMAL(10,2) DEFAULT 0;


-- Tabela de Produtos
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_vendedor INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    nivel_sustentabilidade INT,
    descricao TEXT,
    imagem_url VARCHAR(500),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_vendedor) REFERENCES usuarios(id)
) ENGINE=InnoDB;
-- Tabela de Carrinhos
CREATE TABLE carrinhos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    proposito TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
) ENGINE=InnoDB;
-- Tabela de Junção: carrinho_produtos
CREATE TABLE carrinho_produtos (
    id_carrinho INT NOT NULL,
    id_produto INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    adicionado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_carrinho, id_produto),
    FOREIGN KEY (id_carrinho) REFERENCES carrinhos(id),
    FOREIGN KEY (id_produto) REFERENCES produtos(id)
) ENGINE=InnoDB;
-- Opcional: Adicionar alguns índices para melhorar a performance de buscas comuns
CREATE INDEX idx_produtos_id_vendedor ON produtos(id_vendedor);
CREATE INDEX idx_carrinhos_id_usuario ON carrinhos(id_usuario);

CREATE TABLE carrinhos_backup AS SELECT * FROM oasi_db.carrinhos;

-- Remover a tabela carrinho_produtos primeiro (por causa da foreign key)
DROP TABLE IF EXISTS oasi_db.carrinho_produtos;

-- Remover a tabela carrinhos
DROP TABLE IF EXISTS oasi_db.carrinhos;

DROP TABLE IF EXISTS oasi_db.produtos;

-- Recriar a tabela carrinhos sem o ON DELETE CASCADE
CREATE TABLE oasi_db.carrinhos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    proposito TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Recriar a tabela carrinho_produtos
CREATE TABLE oasi_db.carrinho_produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_carrinho INT NOT NULL,
    id_produto INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    FOREIGN KEY (id_carrinho) REFERENCES carrinhos(id),
    FOREIGN KEY (id_produto) REFERENCES produtos(id),
    UNIQUE KEY unique_cart_product (id_carrinho, id_produto)
) ENGINE=InnoDB;

-- Restaurar os dados dos carrinhos do backup
INSERT INTO oasi_db.carrinhos (id, id_usuario, nome, proposito, criado_em)
SELECT id, id_usuario, nome, proposito, criado_em FROM carrinhos_backup;
