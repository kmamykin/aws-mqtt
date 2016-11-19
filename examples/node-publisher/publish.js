// Usage: node publish.js <topic> <message>
// Example: node publish.js "/chat" Hello

const AWS = require('aws-sdk')
const AWSMqtt = require('../../lib/index')
const WebSocket = require('ws')

const config = require('../config') // NOTE: make sure to copy config.example.js to config.js and fill in your values
const {logEventsToConsole} = require('./utils')

// Initialize the Amazon Cognito credentials provider
AWS.config.region = config.aws.region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: config.aws.cognito.identityPoolId
})


// Connect to broker, publish message to a topic and then disconnect
const publish = (topic, data) => new Promise((resolve, reject) => {
  const client = AWSMqtt.connect({
    WebSocket: WebSocket,
    region: AWS.config.region,
    credentials: AWS.config.credentials,
    endpoint: config.aws.iot.endpoint,
    clientId: 'mqtt-publisher-' + (Math.floor((Math.random() * 100000) + 1)),
  })

  logEventsToConsole(client)

  client.once('connect', () => {
    client.publish(topic, JSON.stringify(data), {}, (err) => {
      if (err) {
        client.end()
        reject(err)
      } else {
        client.end()
        resolve()
      }
    })
  })
  client.once('error', (err) => {
    client.end()
    reject(err)
  })
  client.once('offline', () => {
    client.end()
    reject(new Error("MQTT went offline"))
  })
})

const topic = process.argv[2]
const message = process.argv[3]
publish(topic, message).then(console.log, console.error)
