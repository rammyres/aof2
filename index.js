require('dotenv').config();
const express = require('express');
const oracledb = require('oracledb');
const path = require('path');

const app = express();
const port = 3000;

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
    const dropdownMenu = result.rows.map(row => {
      return {
        value: row[0], // Valor é o campo 'tipo'
        text: row[1] // Texto é o campo 'descricao'
      };
    });

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

// Inicia o servidor Express
app.listen(port, () => {
  console.log(`Servidor Express executando na porta ${port}`);
});
