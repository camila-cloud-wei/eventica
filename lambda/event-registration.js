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

export const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // Only allow POST for registration
        if (event.httpMethod !== 'POST') {
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
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }

        // Validate required fields
        const validationError = validateRegistrationData(body);
        if (validationError) {
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

        // Store in DynamoDB
        await saveRegistration(registrationData);

        console.log(`Registration successful: ${registrationId}`);

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
        console.error('Error processing registration:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
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
    if (data.quantity < 1 || data.quantity > 10) {
        return 'Quantity must be between 1 and 10';
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
async function saveRegistration(registrationData) {
    const params = {
        TableName: TABLE_NAME,
        Item: registrationData
    };

    try {
        const command = new PutCommand(params);
        await docClient.send(command);
        console.log(`Registration saved: ${registrationData.registrationId}`);
    } catch (error) {
        console.error('Error saving to DynamoDB:', error);
        throw new Error('Failed to save registration');
    }
}