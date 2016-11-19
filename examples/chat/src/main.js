// TODO: Something like this should make a smaller bundle? var S3 = require('aws-sdk/clients/s3');
import AWS from 'aws-sdk/global'
import AWSMqttClient from '../../../lib/BrowserClient'
import config from '../../config' // NOTE: make sure to copy config.example.js to config.js and fill in your values
import {logEventsToConsole} from './utils'

// Initialize the Amazon Cognito credentials provider
AWS.config.region = config.aws.region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: config.aws.cognito.identityPoolId
})

const client = new AWSMqttClient({
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: config.aws.iot.endpoint,
  clientId: 'mqtt-client-' + (Math.floor((Math.random() * 100000) + 1)),
})

client.on('connect', () => {
  addLogEntry('Successfully connected to AWS IoT Broker!  :-)')
  client.subscribe(config.topics.time)
  client.subscribe(config.topics.chat)
})
client.on('message', (topic, message) => {
  addLogEntry(`Incoming message from ${topic}: ${message}`)
})
client.on('close', () => {
  addLogEntry('Closed  :-(')
})
client.on('offline', () => {
  addLogEntry('Went offline  :-(')
})

logEventsToConsole(client)

document.getElementById('send').addEventListener('click', () => {
  const message = document.getElementById('message').value
  client.publish(config.topics.chat, message)
});

function addLogEntry(info) {
  const newLogEntry = document.createElement('li')
  newLogEntry.textContent = '[' + (new Date()).toTimeString().slice(0, 8) + '] ' + info

  const theLog = document.getElementById('the-log')
  theLog.insertBefore(newLogEntry, theLog.firstChild)
}
