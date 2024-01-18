require('dotenv').config();
const express = require('express');
const oracledb = require('oracledb');
const path = require('path');
const Chart = require('chart.js');

const app = express();
const port = 3000;

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

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
  const prefixo = req.query.prefixo;
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    //Insere a devolução no BD para fins estatisticos
    const insersao = connection.execute(`
    INSERT INTO AOFS (aof, prefixo, tipo, data_devolucao, sequencial)
    SELECT
      :numeroAOF,
      :prefixo,
      :tipoSelecionado,
      SYSDATE,
      COALESCE(MAX(sequencial) + 1, 1) -- Incrementa o sequencial se o AOF já existir, ou define como 1 se for o primeiro
    FROM AOFS
    WHERE aof = :numeroAOF
`, [numeroAOF, parseInt(prefixo), tipoSelecionado, numeroAOF]
);

    connection.commit();

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
    console.error('Erro ao buscar dados da tabela tipos:', error);
    res.status(500).send('Erro ao buscar os dados da tabela tipo');
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
    console.error('Erro ao inserir novo tipo:', error);
    res.status(500).send('Erro ao inserir novo tipo');
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

// Rota para atualizar um vacilo
// Rota para atualizar um vacilo
app.put('/atualizar-tipo', async (req, res) => {
  const tipo = req.query.tipo;
  const descricao = req.query.descricao;
  const alerta = req.query.alerta;
  const texto = req.query.texto;
  // const { descricao, alerta, texto } = req.body;
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Query SQL para atualizar um vacilo existente
    await connection.execute(
      `UPDATE VACILOS SET DESCRICAO = :descricao, ALERTA = :alerta, TEXTO = :texto WHERE TIPO = :tipo`,
      [descricao, alerta, texto, tipo]
    );

    await connection.commit();

    res.sendStatus(200); // Envie um status 200 para indicar sucesso
  } catch (error) {
    console.error('Erro ao atualizar tipo:', error);
    res.status(500).send('Erro ao atualizar tipo');
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
app.delete('/excluir-tipo', async (req, res) => {
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
    console.error('Erro ao excluir tipo:', error);
    res.status(500).send('Erro ao excluir tipo');
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

// Rota para renderizar o dashboard
app.get('/dashboard', async (req, res) => {
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Consulta SQL para contar devoluções por mês
    const queryDevolucoesPorMes = `
      SELECT TO_CHAR(data_devolucao, 'YYYY-MM') AS mes, COUNT(*) AS total_devolucoes
      FROM AOFS
      GROUP BY TO_CHAR(data_devolucao, 'YYYY-MM')
      ORDER BY TO_CHAR(data_devolucao, 'YYYY-MM')
    `;

    // // Executa a consulta SQL
    const resultDevolucoesPorMes = await connection.execute(queryDevolucoesPorMes);

    // // Consulta SQL para contar devoluções por prefixo
    const queryDevolucoesPorPrefixo = `
      SELECT prefixo, COUNT(*) AS total_devolucoes
      FROM AOFS
      GROUP BY prefixo
      ORDER BY prefixo
    `;

    // // Executa a consulta SQL
    const resultDevolucoesPorPrefixo = await connection.execute(queryDevolucoesPorPrefixo);

    // // Transforma os resultados em um formato adequado para o gráfico de pizza (pie chart)
    const dadosGraficoPizza = {
      labels: resultDevolucoesPorPrefixo.rows.map(row => `Prefixo ${row[0]}`),
      datasets: [{
        data: resultDevolucoesPorPrefixo.rows.map(row => row[1]),
        backgroundColor:  Array.from({ length: resultDevolucoesPorPrefixo.rows.length }, () => getRandomColor()),
        hoverBackgroundColor:  Array.from({ length: resultDevolucoesPorPrefixo.rows.length }, () => getRandomColor()),
      }]
    };

    // Renderiza a página dashboard.ejs e passa os dados para os gráficos
    res.render('dashboard', { 
      devolucoesPorMes: resultDevolucoesPorMes.rows,
      dadosGraficoPizza: JSON.stringify(dadosGraficoPizza)
    });
  } catch (error) {
    console.error('Erro ao buscar dados para o dashboard:', error);
    res.status(500).send('Erro ao buscar dados para o dashboard');
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

// Rota para fornecer dados para o gráfico de pizza por prefixos
app.get('/dados-grafico-prefixo', async (req, res) => {
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Consulta SQL para contar devoluções por prefixo
    const queryDevolucoesPorPrefixo = `
      SELECT prefixo, COUNT(*) AS total_devolucoes
      FROM AOFS
      GROUP BY prefixo
      ORDER BY prefixo
    `;


    // Executa a consulta SQL
    const resultDevolucoesPorPrefixo = await connection.execute(queryDevolucoesPorPrefixo);

    // Formatando os dados no formato necessário para o gráfico de pizza
    const labels = resultDevolucoesPorPrefixo.rows.map(row => ` ${row[0]}`);
    const data = resultDevolucoesPorPrefixo.rows.map(row => row[1]);

    const cores = Array.from({ length: resultDevolucoesPorPrefixo.rows.length }, () => getRandomColor())

    const dadosGraficoPizza = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: cores,
        hoverBackgroundColor: cores,
      }]
    };

    res.json(dadosGraficoPizza);
  } catch (error) {
    console.error('Erro ao buscar dados para o gráfico de pizza:', error);
    res.status(500).json({ error: 'Erro ao buscar dados para o gráfico de pizza' });
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

// Rota para fornecer dados para o gráfico de pizza por tipo
app.get('/dados-grafico-tipo', async (req, res) => {
  let connection;

  try {
    // Estabelece a conexão com o banco de dados
    connection = await oracledb.getConnection(dbConfig);

    // Consulta SQL para contar devoluções por prefixo
    const queryDevolucoesPorTipo = `
      SELECT tipo, COUNT(*) AS total_devolucoes
      FROM AOFS
      GROUP BY tipo
      ORDER BY tipo
    `;

    // Executa a consulta SQL
    const resultDevolucoesPorTipo = await connection.execute(queryDevolucoesPorTipo);

    // Formatando os dados no formato necessário para o gráfico de pizza
    const labels = resultDevolucoesPorTipo.rows.map(row => ` ${row[0]}`);
    const data = resultDevolucoesPorTipo.rows.map(row => row[1]);


    const cores = Array.from({ length: resultDevolucoesPorTipo.rows.length }, () => getRandomColor())
    const dadosGraficoPizza = {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor:  cores,
        hoverBackgroundColor:  cores,
      }]
    };

    res.json(dadosGraficoPizza);
  } catch (error) {
    console.error('Erro ao buscar dados para o gráfico de pizza:', error);
    res.status(500).json({ error: 'Erro ao buscar dados para o gráfico de pizza' });
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
