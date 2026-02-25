'use strict';

const express = require('express');

const { getAllTodos, getTodosByUserId } = require('./todo.controller');

const router = express.Router();

router.get('/todos', getAllTodos);
router.get('/todos/:userId', getTodosByUserId);

module.exports = router;
