// For Node.js 22.x, use AWS SDK v3
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Create DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'eventica-registrations';

// CORS headers for all responses
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Content-Type': 'application/json'
};

// Structured logger
const logger = {
    info: (message, data = {}) => {
        console.log(JSON.stringify({
            level: 'INFO',
            timestamp: new Date().toISOString(),
            message,
            ...data
        }));
    },
    error: (message, error = {}, data = {}) => {
        console.error(JSON.stringify({
            level: 'ERROR',
            timestamp: new Date().toISOString(),
            message,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            ...data
        }));
    },
    warn: (message, data = {}) => {
        console.warn(JSON.stringify({
            level: 'WARN',
            timestamp: new Date().toISOString(),
            message,
            ...data
        }));
    }
};

export const handler = async (event) => {
    const requestId = event.requestContext?.requestId || 'unknown';
    const startTime = Date.now();
    
    logger.info('Registration request received', {
        requestId,
        httpMethod: event.httpMethod,
        path: event.path,
        userAgent: event.headers?.['User-Agent'],
        sourceIp: event.requestContext?.identity?.sourceIp
    });

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        logger.info('OPTIONS preflight request handled', { requestId });
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // Only allow POST for registration
        if (event.httpMethod !== 'POST') {
            logger.warn('Method not allowed', { 
                requestId, 
                method: event.httpMethod 
            });
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        // Parse request body
        let body;
        try {
            body = JSON.parse(event.body);
            logger.info('Request body parsed successfully', { 
                requestId,
                hasFirstName: !!body.firstName,
                hasEmail: !!body.email,
                ticketType: body.ticketType,
                quantity: body.quantity
            });
        } catch (parseError) {
            logger.error('Invalid JSON in request body', parseError, { 
                requestId,
                body: event.body 
            });
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }

        // Validate required fields
        const validationError = validateRegistrationData(body);
        if (validationError) {
            logger.warn('Validation failed', { 
                requestId,
                error: validationError,
                providedData: {
                    firstName: body.firstName ? 'provided' : 'missing',
                    lastName: body.lastName ? 'provided' : 'missing',
                    email: body.email ? 'provided' : 'missing',
                    ticketType: body.ticketType,
                    quantity: body.quantity
                }
            });
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: validationError })
            };
        }

        // Create registration record
        const registrationId = generateRegistrationId();
        const ticketPrices = { general: 49, vip: 129, student: 29 };
        const subtotal = ticketPrices[body.ticketType] * body.quantity;
        const tax = Math.round(subtotal * 0.08);
        const total = subtotal + tax;

        const registrationData = {
            registrationId,
            ...body,
            totalAmount: total,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        logger.info('Processing registration', {
            requestId,
            registrationId,
            email: body.email,
            ticketType: body.ticketType,
            quantity: body.quantity,
            totalAmount: total
        });

        // Store in DynamoDB
        await saveRegistration(registrationData, requestId);

        const processingTime = Date.now() - startTime;
        logger.info('Registration completed successfully', {
            requestId,
            registrationId,
            processingTime: `${processingTime}ms`,
            dynamoDbOperation: 'PutItem'
        });

        return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Registration successful',
                registrationId,
                data: registrationData
            })
        };

    } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error('Registration processing failed', error, {
            requestId,
            processingTime: `${processingTime}ms`,
            errorType: error.name
        });
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: 'Unable to process registration at this time'
            })
        };
    }
};

// Validate registration data
function validateRegistrationData(data) {
    const requiredFields = ['firstName', 'lastName', 'email', 'ticketType', 'quantity'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        return `Missing required fields: ${missingFields.join(', ')}`;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return 'Invalid email format';
    }

    // Quantity validation
    const quantity = parseInt(data.quantity);
    if (isNaN(quantity) || quantity < 1 || quantity > 10) {
        return 'Quantity must be a number between 1 and 10';
    }

    // Ticket type validation
    const validTicketTypes = ['general', 'vip', 'student'];
    if (!validTicketTypes.includes(data.ticketType)) {
        return 'Invalid ticket type';
    }

    return null;
}

// Generate unique registration ID
function generateRegistrationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `EVT-${timestamp}-${random}`.toUpperCase();
}

// Save registration to DynamoDB using AWS SDK v3
async function saveRegistration(registrationData, requestId) {
    const params = {
        TableName: TABLE_NAME,
        Item: registrationData
    };

    try {
        const command = new PutCommand(params);
        await docClient.send(command);
        logger.info('Registration saved to DynamoDB', {
            requestId,
            registrationId: registrationData.registrationId,
            tableName: TABLE_NAME
        });
    } catch (error) {
        logger.error('DynamoDB operation failed', error, {
            requestId,
            registrationId: registrationData.registrationId,
            tableName: TABLE_NAME,
            operation: 'PutItem'
        });
        throw new Error('Failed to save registration to database');
    }
}