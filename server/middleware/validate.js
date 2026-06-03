/**
 * server/middleware/validate.js
 * ==============================
 * Express request validation middleware using express-validator.
 *
 * Usage in routes:
 *   const { validate, rules } = require('../middleware/validate');
 *   router.post('/run/parse', validate(rules.parse), handler);
 *
 * Any validation failure returns 422 with a structured errors array
 * instead of letting bad input bubble up as an unhandled crash.
 */

const { body, validationResult } = require('express-validator');

/**
 * Middleware factory: runs express-validator checks, then either
 * short-circuits with a 422 response or calls next().
 */
const validate = (checks) => [
  ...checks,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        error: 'Validation failed',
        details: errors.array().map((e) => ({
          field: e.path,
          message: e.msg,
          received: e.value,
        })),
      });
    }
    next();
  },
];

/**
 * Validation rule sets for each route group.
 */
const rules = {
  // POST /run/parse  — requires a non-empty string, max 500KB
  parse: [
    body('code')
      .exists({ checkNull: true })
      .withMessage('code is required')
      .isString()
      .withMessage('code must be a string')
      .notEmpty()
      .withMessage('code must not be empty')
      .isLength({ max: 512000 })
      .withMessage('Circuit code must be 500 KB or smaller'),
  ],

  // POST /run/compile  — requires an object with type "Program"
  compile: [
    body('ast')
      .exists({ checkNull: true })
      .withMessage('ast is required')
      .isObject()
      .withMessage('ast must be an object'),
    body('ast.type')
      .optional()
      .isString()
      .withMessage('ast.type must be a string'),
  ],

  // POST /run/transpile & /run/visualize & /run/simulate — requires ir object
  ir: [
    body('ir')
      .exists({ checkNull: true })
      .withMessage('ir is required')
      .isObject()
      .withMessage('ir must be an object'),
  ],

  // POST /run/debug/step
  debugStep: [
    body('ir')
      .exists({ checkNull: true })
      .withMessage('ir is required')
      .isObject()
      .withMessage('ir must be an object'),
    body('index')
      .optional()
      .isInt({ min: -1 })
      .withMessage('index must be an integer >= -1')
      .toInt(),
  ],

  // POST /projects
  saveProject: [
    body('code')
      .exists({ checkNull: true })
      .withMessage('code is required')
      .isString()
      .withMessage('code must be a string')
      .isLength({ max: 512000 })
      .withMessage('Circuit code must be 500 KB or smaller'),
    body('name')
      .optional()
      .isString()
      .withMessage('name must be a string')
      .isLength({ max: 200 })
      .withMessage('name must be at most 200 characters')
      .trim(),
  ],

  // PUT /projects/:id
  renameProject: [
    body('name')
      .optional()
      .isString()
      .withMessage('name must be a string')
      .isLength({ max: 200 })
      .withMessage('name must be at most 200 characters')
      .trim(),
    body('code')
      .optional()
      .isString()
      .withMessage('code must be a string')
      .isLength({ max: 512000 })
      .withMessage('Circuit code must be 500 KB or smaller'),
  ],

  // POST /user/token
  ibmToken: [
    body('ibmToken')
      .exists({ checkNull: true })
      .withMessage('ibmToken is required')
      .isString()
      .withMessage('ibmToken must be a string')
      .notEmpty()
      .withMessage('ibmToken must not be empty'),
  ],

  // POST /cloud/submit
  cloudSubmit: [
    body('ir')
      .exists({ checkNull: true })
      .withMessage('ir is required')
      .isObject()
      .withMessage('ir must be an object'),
    body('backend')
      .optional()
      .isString()
      .withMessage('backend must be a string')
      .isIn([
        'ibm_osaka', 'ibm_kyoto', 'ibm_brisbane', 'ibm_sherbrooke',
        'ibm_nazca', 'ibm_cusco', 'ibm_kawasaki', 'ibm_torino',
      ])
      .withMessage('backend must be a valid IBM Quantum backend name'),
    body('projectName')
      .optional()
      .isString()
      .withMessage('projectName must be a string')
      .isLength({ max: 200 })
      .withMessage('projectName must be at most 200 characters')
      .trim(),
  ],

  // POST /auth/register & /auth/login
  authCredentials: [
    body('email')
      .exists({ checkNull: true })
      .withMessage('email is required')
      .isEmail()
      .withMessage('email must be a valid email address')
      .normalizeEmail(),
    body('password')
      .exists({ checkNull: true })
      .withMessage('password is required')
      .isString()
      .withMessage('password must be a string')
      .isLength({ min: 6 })
      .withMessage('password must be at least 6 characters'),
  ],

  // POST /run/transpile/reverse
  reverseTranspile: [
    body('qasm')
      .exists({ checkNull: true })
      .withMessage('qasm is required')
      .isString()
      .withMessage('qasm must be a string')
      .notEmpty()
      .withMessage('qasm must not be empty'),
  ],

  // POST /run/bloch
  bloch: [
    body('statevector')
      .exists({ checkNull: true })
      .withMessage('statevector is required')
      .isArray()
      .withMessage('statevector must be an array'),
    body('num_qubits')
      .exists({ checkNull: true })
      .withMessage('num_qubits is required')
      .isInt({ min: 1 })
      .withMessage('num_qubits must be an integer >= 1'),
  ],
};

module.exports = { validate, rules };
