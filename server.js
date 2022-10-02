const express = require('express');
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const { body, param, validationResult } = require('express-validator');

app.use(express.json());


/**
 * @swagger
 * components:
 *     schemas:
 *         Agent:
 *             type: object
 *             properties:
 *                  agentCode:
 *                       type: string
 *                       required: true
 *                  agentName:
 *                       type: string
 *                  workArea:
 *                       type: string
 *                  commission:
 *                       type: string
 *                  phoneNo:
 *                       type: string
 *                  country:
 *                       type: string
 *         AgentPut:
 *             type: object
 *             properties:
 *                  agentName:
 *                       type: string
 *                  workArea:
 *                       type: string
 *                  commission:
 *                       type: string
 *                  phoneNo:
 *                       type: string
 *                  country:
 *                       type: string
 *         AgentPatch:
 *            type: object
 *            properties:
 *                  workArea:
 *                       type: string
 *                  commission:
 *                       type: string
 */

 const options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    components: {},
    info: {
      title: 'ITIS - 6177 Assignment 08',
      version: '1.0.0',
      description: 'REST API + Swagger Week 06'
    },
    host: '147.182.188.131:3001',
    basePath: '/',
  },
  apis: ['./server.js']
};

const specs = swaggerJsDoc(options);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use(cors({
  origin: '*'
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const mariadb = require('mariadb');
const pool = mariadb.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  port: 3306,
  connectionLimit: 5,
  database: 'sample',
  socketPath: '/var/lib/mysql/mysql.sock'

});



app.get('/', (req, res) => {
  res.send('Welcome!');
});

/*Validation and Sanitization */

const validateAgent = [
  body('agentCode')
    .exists()
    .withMessage('Agent Code is required and cannot be empty')
    .notEmpty().trim().escape(), body('agentName').exists().withMessage('agentName is missing').trim().escape(), body('workArea').exists().withMessage('workArea is missing').trim().escape(), body('commission').exists().withMessage('commission is missing').trim().escape(), body('phoneNo', 'Phone Number should be a number of length 10').optional({ checkFalsy: true }).trim().isNumeric().isLength({ min: 10 }).escape(), body('country').exists().withMessage('country is missing').trim().escape()];

const validateAgentPatch = [
  body('workArea')
    .exists()
    .withMessage('workArea is missing')
    .trim().escape(), body('commission').exists().withMessage('commission is missing').trim().escape()];

const validateAgentPut = [body('agentName').exists().withMessage('agentName is missing').trim().escape(), body('workArea').exists().withMessage('workArea is missing').trim().escape(), body('commission').exists().withMessage('commission is missing').trim().escape(), body('phoneNo', 'Phone Number should be a number of length 10').optional({ checkFalsy: true }).trim().isNumeric().isLength({ min: 10 }).escape(), body('country').exists().withMessage('country is missing').trim().escape()];

const validateAgentCodeParam = [param('code').exists().withMessage('Agent Code is required and cannot be empty').notEmpty().trim().escape()];

/**
 * @swagger
 * /agents:
 *     get:
 *       description: return all agents
 *       produces:
 *          - application/json
 *       responses:
 *          200:
 *              description: object agent containing an array of agent details
 */
app.get('/agents', async (req, res) => {
  try {
    const result = await pool.query("select * from agents");
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (err) {
    const errResponse = { result: 'failed', message: 'Error fetching agents' };
    res.status(500).json(errResponse);
  }
});



/**
* @swagger
* /agents/{code}:
*    put:
*       description: used to update data to agents table
*       parameters:
*          - in: path
*            name: code
*            required: true
*            description: Agent Code is required
*            schema:
*               type: string
*       requestBody:
*             required: true
*             content:
*                  application/json:
*                      schema:
*                          $ref: '#components/schemas/AgentPut'
*       responses:
*          200:
*              description: agent updated
*              content:
*                  application/json:
*                      schema:
*                          type: object
*                          items:
*                              $ref: '#components/schemas/Agent'
*          404:
*              description: agent not found in database
*          500:
*              description: error updating the agent  
*          422:
*              description: validation error   
*/

app.put('/agents/:code', validateAgentCodeParam, validateAgentPut, async (req, res) => {
  let response = { result: 'failed', message: 'Error updating data' };
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  try {
    const reqbody = req.body;
    const sql = "UPDATE agents SET AGENT_NAME = '" + reqbody.agentName + "', WORKING_AREA = '" + reqbody.workArea + "', COMMISSION = '" + reqbody.commission + "', PHONE_NO = '" + reqbody.phoneNo + "', COUNTRY = '" + reqbody.country + "' WHERE AGENT_CODE = '" + req.params.code + "'";

    const result = await pool.query(sql);

    if (result.affectedRows) {
      response = { result: 'ok' };
      res.status(200);
    } else {
      res.status(404);
      response.message = "Agent not found in the database";
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
  } catch (err) {
    response.message = err.message;
    res.status(500);
    res.json(response);
  }
});

/**
 * @swagger
 * /agents:
 *    post:
 *       description: insert a record into agents
 *       requestBody:
 *             required: true
 *             content: 
 *                  application/json:
 *                      schema:
 *                          $ref: '#components/schemas/Agent'
 *       responses:
 *          200:
 *              description: agent created
 *          422:
 *              description: validation error
 *          500:
 *              description: error inserting the agent
 */

app.post('/agents', validateAgent, async (req, res) => {
  let response = { result: 'failed', message: 'Error inserting agent' };

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const reqbody = req.body;
    const insertData = "insert into agents (AGENT_CODE, AGENT_NAME, WORKING_AREA, COMMISSION, PHONE_NO, COUNTRY) VALUES ('" + reqbody.agentCode + "', '" + reqbody.agentName + "', '" + reqbody.workArea + "', '" + reqbody.commission + "', '" + reqbody.phoneNo + "', '" + reqbody.country + "')";
    const result = await pool.query(insertData);

    if (result.affectedRows) {
      response = { result: 'ok' };
      res.status(200);
    } else {
      res.status(500);
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
  } catch (err) {
    response.message = err.message;
    res.status(500);
    res.json(response);
  }
});


/**
 * @swagger
 * /agents/{code}:
 *    patch:
 *       description: used to update partial data to agents row
 *       parameters:
 *          - in: path
 *            name: code
 *            required: true
 *            description: Agent code is required
 *            schema:
 *               type: string
 *       requestBody:
 *             required: true
 *             content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#components/schemas/AgentPatch'
 *       responses:
 *          200:
 *            description: agent updated with commission and work area
 *            content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          items:
 *                              $ref: '#components/schemas/AgentPatch'
 *          404:
 *              description: agent not found in database
 *          500:
 *              description: error updating the agent data 
 *          422:
 *              description: validation error
 */

app.patch('/agents/:code', validateAgentCodeParam, validateAgentPatch, async (req, res) => {
  let response = { result: 'failed', message: 'Error updating agent commission and work area' };
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  try {
    const reqbody = req.body;

    const sql = "UPDATE agents SET  WORKING_AREA = '" + reqbody.workArea + "' , COMMISSION = '" + reqbody.commission + "' WHERE AGENT_CODE = '" + req.params.code + "'";

    const result = await pool.query(sql);

    if (result.affectedRows) {
      response = { result: 'ok' };
      res.status(200);
    } else {
      res.status(404);
      response.message = "Agent is not found in the database";
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
  } catch (err) {
    response.message = err.message;
    res.status(500);
    res.json(response);
  }
});



/**
* @swagger
* /agents/{code}:
*    delete:
*       description: used to delete record from agents table
*       parameters:
*          - in: path
*            name: code
*            required: true
*            description: Agent Code is required
*            schema:
*               type: string
*       responses:
*          200:
*              description: agent deleted
*          404:
*              description: agent is not found in database
*          500:
*              description: error in deleting the agent 
*          422:
*              description: path parameter validation error
*/

app.delete('/agents/:code', validateAgentCodeParam, async (req, res) => {
  let response = { result: 'failed', message: 'Error deleting agent' };
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  try {
    const sql = "DELETE FROM agents WHERE AGENT_CODE = '" + req.params.code + "'";

    const result = await pool.query(sql);

    if (result.affectedRows) {
      response = { result: 'ok' };
      res.status(200);
    } else {
      res.status(404);
      response.message = "Agent is not found in the database";
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
  } catch (err) {
    response.message = err.message;
    res.status(500);
    res.json(response);
  }
});



/**
 * @swagger
 * /customers:
 *     get:
 *       description: return all customers details
 *       produces:
 *          - application/json
 *       responses:
 *          200:
 *              description: object customer containing an array of customer data
 *          500:
 *              description: error in getting customers data
 */
app.get('/customers', async (req, res) => {
  try {
    const result = await pool.query("select * from customer");
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (err) {
    const errResponse = { result: 'failed', message: 'Error in getting customers data' };
    res.status(500).json(errResponse);
  }
});

/**
 * @swagger
 * /orders:
 *     get:
 *       description: return all orders details
 *       produces:
 *          - application/json
 *       responses:
 *          200:
 *              description: object order containing an array of orders data
 *          500: 
 *              description: Error in getting orders data
 */
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query("select * from orders");
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (err) {
    const errResponse = { result: 'failed', message: 'Error in getting orders data' };
    res.status(500).json(errResponse);
  }
});

app.use(function (req, res) {
  res.status(404).send('Error! 404 request not found!');
});

app.listen(port, () => {
  console.log(` Server listening on port ${port}`)
})

