// Usage: node publish.js <topic> <message>
// Example: node publish.js "/chat" Hello

const AWS = require('aws-sdk')
const publishMessage = require('../../lib/publishMessage')

const config = require('../config') // NOTE: make sure to copy config.example.js to config.js and fill in your values

// Initialize the Amazon Cognito credentials provider
AWS.config.region = config.aws.region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: config.aws.cognito.identityPoolId,
})

const topic = process.argv[2]
const message = process.argv[3]

publishMessage(
  {
    region: AWS.config.region,
    endpoint: config.aws.iot.endpoint,
    credentials: AWS.config.credentials,
  },
  topic,
  message
).then(() => console.log('Success'), console.error)
