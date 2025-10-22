#!/bin/bash

# Configuration
STACK_NAME="eventica-registration"
STAGE="${1:-dev}"
REGION="${2:-us-east-1}"
BUCKET_NAME="web-grupo14-eventica-$STAGE"

echo "Deploying Eventica Registration Stack to $STAGE..."

# Create S3 bucket for artifacts if it doesn't exist
if ! aws s3 ls "s3://$BUCKET_NAME" --region $REGION 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Creating S3 bucket: $BUCKET_NAME"
    aws s3 mb "s3://$BUCKET_NAME" --region $REGION
fi

# Package CloudFormation template
echo "Packaging CloudFormation template..."
aws cloudformation package \
    --template-file cloudformation/template.yaml \
    --s3-bucket $BUCKET_NAME \
    --s3-prefix cloudformation \
    --output-template-file packaged-template.yaml \
    --region $REGION

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file packaged-template.yaml \
    --stack-name $STACK_NAME-$STAGE \
    --parameter-overrides Stage=$STAGE \
    --capabilities CAPABILITY_IAM \
    --region $REGION

# Get API Gateway URL
API_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME-$STAGE \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text \
    --region $REGION)

echo "Deployment complete!"
echo "API Gateway URL: $API_URL"
echo "Test registration endpoint: $API_URL/register"

# Clean up
rm -f packaged-template.yaml

echo "You can now update your frontend to use: $API_URL"