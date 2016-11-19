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

const client = AWSMqtt.connect({
  WebSocket: WebSocket,
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: config.aws.iot.endpoint,
  clientId: 'mqtt-time-publisher-' + (Math.floor((Math.random() * 100000) + 1)),
})

const Timer = (fn, interval) => {
  let t
  return {
    start: () => {
      t = setInterval(fn, interval)
    },
    stop: () => {
      clearInterval(t)
    }
  }
}

client.on('connect', () => {
  console.log('Successfully connected to AWS IoT Broker!  :-)')
  client.subscribe(config.topics.chat)
})
client.on('message', (topic, message) => {
  console.log(`Incoming message from ${topic}: ${message}`)
})

const timeAnnouncer = Timer(() => {
  client.publish(config.topics.time, `Time now is ${Date.now()}`)
}, 3000)

client.on('connect', timeAnnouncer.start)
client.on('close', timeAnnouncer.stop)
client.on('offline', timeAnnouncer.stop)

logEventsToConsole(client)

