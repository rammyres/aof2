require('dotenv').config();
const express = require('express');
const oracledb = require('oracledb');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
// Configuração da conexão com o banco de dados Oracle
const dbConfig = {
  user: process.env.BD_USUARIO,
  password: process.env.BD_SENHA,
  connectString: process.env.BD_STRING,
};

// Configuração do mecanismo de visualização EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Rota para renderizar a página com o menu dropdown
app.get('/', async (req, res) => {
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Consulta SQL para recuperar os dados da tabela vacilos
    const query = `SELECT tipo, descricao FROM vacilos`;

    // Executa a consulta SQL
    const result = await connection.execute(query);

    // Processa os resultados para criar o menu dropdown
    let dropdownMenu = result.rows.map(row => {
      return {
        value: row[0], // Valor é o campo 'tipo'
        text: row[1] // Texto é o campo 'descricao'
      };
    });
    dropdownMenu = [{ value: '', text: 'Selecione o motivo' }, ...dropdownMenu];

    // Renderiza a página e passa os dados do menu dropdown para a view
    res.render('index', { dropdownMenu });
  } catch (error) {
    console.error('Erro ao obter dados da tabela vacilos:', error);
    res.status(500).send('Erro ao obter os dados da tabela vacilos');
  } finally {
    // Libera a conexão com o banco de dados
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Erro ao fechar a conexão com o banco de dados:', error);
      }
    }
  }
});

// Rota para buscar o alerta com base no tipo selecionado
app.get('/alerta', async (req, res) => {
  const tipoSelecionado = req.query.tipo;
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Consulta SQL para recuperar o alerta com base no tipo selecionado
    const query = `SELECT alerta FROM vacilos WHERE tipo = :tipoSelecionado`;
    const result = await connection.execute(query, [tipoSelecionado]);

    if (result.rows && result.rows.length > 0) {
      const alerta = result.rows[0][0];
      res.json({ alerta });
    } else {
      res.json({ alerta: null });
    }
  } catch (error) {
    console.error('Erro ao buscar o alerta:', error);
    res.status(500).json({ alerta: null });
  } finally {
    // Libera a conexão com o banco de dados
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Erro ao fechar a conexão com o banco de dados:', error);
      }
    }
  }
});

// Rota para exibir o texto correspondente ao tipo selecionado

app.get('/texto', async (req, res) => {
  const tipoSelecionado = req.query.tipo;
  const numeroAOF = req.query.numeroAOF; 
  const justificativa = req.query.justificativa;
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Consulta SQL para recuperar o texto correspondente ao tipo selecionado
    const query = `SELECT texto FROM vacilos WHERE tipo = :tipoSelecionado`;
    const result = await connection.execute(query, [tipoSelecionado]);

    if (result.rows && result.rows.length > 0) {
      const texto = result.rows[0][0];
      res.render('texto', { texto, numeroAOF, justificativa }); // Passa o número AOF recuperado pela URL
    } else {
      res.status(404).send('Informações não encontradas para o tipo selecionado');
    }
  } catch (error) {
    console.error('Erro ao buscar informações:', error);
    res.status(500).send('Erro ao buscar as informações correspondentes ao tipo selecionado');
  } finally {
    // Libera a conexão com o banco de dados
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Erro ao fechar a conexão com o banco de dados:', error);
      }
    }
  }
});

// Rota para renderizar a página de inserção de novos vacilos
app.get('/novo-tipo', async (req, res) => {
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Consulta SQL para recuperar os dados da tabela vacilos
    const query = `SELECT * FROM vacilos`;

    // Executa a consulta SQL
    const result = await connection.execute(query);

    // Renderiza a página inserirNovoTipo.ejs e passa os dados da tabela para exibição
    res.render('inserirNovoTipo', { vacilos: result.rows });
  } catch (error) {
    console.error('Erro ao buscar dados da tabela vacilos:', error);
    res.status(500).send('Erro ao buscar os dados da tabela vacilos');
  } finally {
    // Libera a conexão com o banco de dados
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Erro ao fechar a conexão com o banco de dados:', error);
      }
    }
  }
});


// Rota para processar o formulário de inserção de novos vacilos
app.post('/inserir-novo-tipo', async (req, res) => {
  const { tipo, descricao, alerta, texto } = req.body;
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Query SQL para inserir um novo vacilo
    await connection.execute(
      `INSERT INTO VACILOS (TIPO, DESCRICAO, ALERTA, TEXTO) VALUES (:tipo, :descricao, :alerta, :texto)`,
      [tipo, descricao, alerta, texto]
    );
    
    await connection.commit();

    res.redirect('/'); // Redireciona de volta para a página inicial após a inserção bem-sucedida
  } catch (error) {
    console.error('Erro ao inserir novo vacilo:', error);
    res.status(500).send('Erro ao inserir novo vacilo');
  } finally {
    // Libera a conexão com o banco de dados
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Erro ao fechar a conexão com o banco de dados:', error);
      }
    }
  }
});

// Rota para excluir um vacilo
app.delete('/excluir-vacilo', async (req, res) => {
  const tipo = req.query.tipo;
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Query SQL para excluir o vacilo com base no tipo
    const query = `DELETE FROM vacilos WHERE tipo = :tipo`;
    await connection.execute(query, [tipo]);

    await connection.commit();

    res.sendStatus(200); // Envie um status 200 para indicar sucesso
  } catch (error) {
    console.error('Erro ao excluir vacilo:', error);
    res.status(500).send('Erro ao excluir vacilo');
  } finally {
    // Libera a conexão com o banco de dados
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Erro ao fechar a conexão com o banco de dados:', error);
      }
    }
  }
});



// Inicia o servidor Express
app.listen(port, () => {
  console.log(`Servidor Express executando na porta ${port}`);
});
