import AWSMqttClient from '../src'
import AWS from 'aws-sdk/global'
import config from '../examples/config' // NOTE: make sure to copy config.example.js to config.js and fill in your values
import { logEventsToConsole } from './utils'
import WebSocket from 'ws'

// Initialize the Amazon Cognito credentials provider
AWS.config.region = config.aws.region
// AWS.config.credentials = new AWS.CognitoIdentityCredentials({
//   IdentityPoolId: config.aws.cognito.identityPoolId
// })
AWS.config.credentials = new AWS.SharedIniFileCredentials({
  profile: 'aws-mqtt',
})
// AWS.config.credentials = new AWS.TemporaryCredentials();

// console.log(config)
// console.log(AWS.config.credentials)

describe('AwsMqttClient', () => {
  let client = null

  describe('connection to AWS MQTT broker', () => {
    test.skip('Problem: MQTT still has something handing preventing jest test to complete', done => {
      client = AWSMqttClient.connect({
        WebSocket: WebSocket,
        region: AWS.config.region + '1',
        credentials: AWS.config.credentials,
        endpoint: config.aws.iot.endpoint,
        clientId: 'mqtt-client-test1',
      })
      // logEventsToConsole(client)
      client.on('connect', () => {
        client.end()
        done(new Error('Should not have emitted connect event'))
      })
      // NOTE: MQTT client intentionally ignores stream connection errors
      // and emits OFFLINE/CLOSE events
      client.on('close', () => {
        client.end(true, () => {
          done()
        })
      })
    })
    test('successfully connects', done => {
      client = AWSMqttClient.connect({
        WebSocket: WebSocket,
        region: AWS.config.region,
        credentials: AWS.config.credentials,
        endpoint: config.aws.iot.endpoint,
        clientId: 'mqtt-client-test2',
      })
      logEventsToConsole(client)
      client.on('connect', () => {
        client.end()
        done()
      })
      client.on('offline', () => {
        client.end()
        done(new Error('Should not have gone offline'))
      })
    })
  })
})
