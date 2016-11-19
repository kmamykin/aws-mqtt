// Usage: node publish.js <topic> <message>
// Example: node publish.js "/chat" Hello

const AWS = require('aws-sdk')
const AWSMqtt = require('../../lib/index')
const WebSocket = require('ws')

const config = require('../config') // NOTE: make sure to copy config.example.js to config.js and fill in your values

// Initialize the Amazon Cognito credentials provider
AWS.config.region = config.aws.region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: config.aws.cognito.identityPoolId
})

const publish = AWSMqtt.publisher({
  WebSocket: WebSocket,
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: config.aws.iot.endpoint
})
const topic = process.argv[2]
const message = process.argv[3]
publish(topic, message).then(() => console.log('Success'), console.error)
