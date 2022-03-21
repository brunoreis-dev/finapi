const { request } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());

const customers = [];

function verifyIfExisteAccountCPF(req, res, next) {
  const { cpf } = req.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return res.status(404).json({ error: 'Usuário não existe' });
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  return statement.reduce((total, operation) => {
    if (operation.type === 'credit') {
      return total + operation.amount;
    }

    if (operation.type === 'debit') {
      return total - operation.amount;
    }
  }, 0);
}

app.post('/account', (req, res) => {
  const { cpf, name } = req.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return res.status(400).json({ error: 'Usuário já existe' });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  });

  return res.status(201).json({ success: 'Usuário criado com sucesso' });
});

app.get('/statement', verifyIfExisteAccountCPF, (req, res) => {
  const { customer } = req;
  return res.json({ statement: customer.statement });
});

app.post('/deposit', verifyIfExisteAccountCPF, (req, res) => {
  const { description, amount } = req.body;

  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit',
  };

  customer.statement.push(statementOperation);

  return res.status(201).json(customer);
});

app.post('/withdraw', verifyIfExisteAccountCPF, (req, res) => {
  const { amount, description } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);

  if (amount > balance) {
    return res.status(400).json({ error: 'Saldo insuficiente', balance });
  }

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'debit',
  };

  customer.statement.push(statementOperation);

  return res.status(201).json({ balance: balance - amount });
});

app.get('/statement/date', verifyIfExisteAccountCPF, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormat = new Date(date + ' 00:00');

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return res.json(statement);
});

app.put('/account', verifyIfExisteAccountCPF, (req, res) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;

  return res.status(201).json({ customer });
});

app.get('/account', verifyIfExisteAccountCPF, (req, res) => {
  const { customer } = req;
  return res.json(customer);
});

app.delete('/account', verifyIfExisteAccountCPF, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  return res.status(204).json(customers);
});

app.get('/balance', verifyIfExisteAccountCPF, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement);

  return res.json({ balance });
});

app.listen(3333);
