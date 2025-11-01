// For Node.js 22.x, use AWS SDK v3
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'eventica-registrations';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,DELETE',
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
    }
};

// ✅ FUNCIÓN: Get all registrations
async function getAllRegistrations() {
    try {
        const params = {
            TableName: TABLE_NAME
        };
        
        const command = new ScanCommand(params);
        const result = await docClient.send(command);
        
        logger.info('Retrieved all registrations', {
            count: result.Items?.length || 0
        });
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: result.Items || [],
                count: result.Items?.length || 0
            })
        };
    } catch (error) {
        logger.error('Failed to retrieve registrations', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to retrieve registrations' })
        };
    }
}

// ✅ NUEVA FUNCIÓN: Delete registration
async function deleteRegistration(registrationId) {
    try {
        const params = {
            TableName: TABLE_NAME,
            Key: { registrationId }
        };
        
        const command = new DeleteCommand(params);
        await docClient.send(command);
        
        logger.info('Registration deleted successfully', { registrationId });
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Registration deleted successfully'
            })
        };
    } catch (error) {
        logger.error('Failed to delete registration', error, { registrationId });
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Failed to delete registration' })
        };
    }
}

// ✅ FUNCIÓN: Save registration
async function saveRegistration(registrationData) {
    const params = {
        TableName: TABLE_NAME,
        Item: registrationData
    };

    try {
        const command = new PutCommand(params);
        await docClient.send(command);
        logger.info('Registration saved to DynamoDB', {
            registrationId: registrationData.registrationId
        });
    } catch (error) {
        logger.error('DynamoDB operation failed', error);
        throw new Error('Failed to save registration to database');
    }
}

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

// ✅ HANDLER COMPLETO CON DELETE
export const handler = async (event) => {
    console.log('EVENT:', JSON.stringify({
        method: event.httpMethod,
        path: event.path,
        resource: event.resource,
        pathParameters: event.pathParameters
    }));

    // Handle OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    // ✅ GET /registrations - Return all registrations
    if (event.httpMethod === 'GET' && event.resource === '/registrations') {
        return await getAllRegistrations();
    }

    // ✅ DELETE /registrations/{id} - Delete specific registration
    if (event.httpMethod === 'DELETE' && event.resource === '/registrations/{id}') {
        const registrationId = event.pathParameters.id;
        return await deleteRegistration(registrationId);
    }

    // ✅ POST /register - Save new registration
    if (event.httpMethod === 'POST' && event.resource === '/register') {
        try {
            let body;
            try {
                body = JSON.parse(event.body);
                logger.info('Request body parsed successfully', { 
                    email: body.email,
                    ticketType: body.ticketType,
                    quantity: body.quantity
                });
            } catch (parseError) {
                logger.error('Invalid JSON in request body', parseError);
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Invalid JSON in request body' })
                };
            }

            // Validate required fields
            const validationError = validateRegistrationData(body);
            if (validationError) {
                logger.warn('Validation failed', { error: validationError });
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
                registrationId,
                email: body.email,
                ticketType: body.ticketType,
                quantity: body.quantity,
                totalAmount: total
            });

            // Store in DynamoDB
            await saveRegistration(registrationData);

            logger.info('Registration completed successfully', {
                registrationId
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
            logger.error('Registration processing failed', error);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Internal server error',
                    message: 'Unable to process registration at this time'
                })
            };
        }
    }

    // Route not found
    return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Route not found' })
    };
};