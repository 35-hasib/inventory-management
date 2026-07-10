const service = require("./auth.service");

async function register(req, res) {
  const result = await service.register(req.body);
  res.status(201).json(result);
}

async function login(req, res) {
  const result = await service.login(req.body);
  res.json(result);
}

async function me(req, res) {
  const result = await service.me(req.auth.userId);
  res.json(result);
}

async function changePassword(req, res) {
  const result = await service.changePassword(req.auth.userId, req.body);
  res.json(result);
}

module.exports = { register, login, me, changePassword };
