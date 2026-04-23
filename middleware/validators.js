'use strict';

const { validationResult } = require('express-validator');

/**
 * Terminal middleware for express-validator chains. If any validation errors
 * were recorded for the request, respond 400 with the error list; otherwise
 * continue.
 */
function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(400).json({
    error: 'validation_failed',
    details: result.array({ onlyFirstError: true }),
  });
}

module.exports = { handleValidation };
