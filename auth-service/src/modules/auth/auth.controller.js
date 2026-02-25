'use strict';

const { validateRegisterPayload } = require('./auth.validation');
const { registerUser } = require('./auth.service');

async function register(req, res, next) {
  try {
    const input = validateRegisterPayload(req.body);
    const result = await registerUser(input);

    res.status(201).json({
      message: 'User registered successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
};
