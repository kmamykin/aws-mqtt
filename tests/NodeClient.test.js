import NodeClient from '../src/NodeClient'
import AWS from 'aws-sdk/global'
import config from '../examples/config' // NOTE: make sure to copy config.example.js to config.js and fill in your values
import { logEventsToConsole } from './utils'

// Initialize the Amazon Cognito credentials provider
AWS.config.region = config.aws.region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: config.aws.cognito.identityPoolId
})
// AWS.config.credentials = new AWS.SharedIniFileCredentials({
//   profile: 'aws-mqtt',
// })

jest.setTimeout(10000)

describe('NodeClient', () => {
  let client = null

  describe('connection to AWS MQTT broker', () => {
    test('with wrong credentials emits error event', done => {
      // NOTE: MQTT client intentionally ignores stream connection errors
      // and emits OFFLINE/CLOSE events. This makes handling initial connectivity errors difficult.
      // NodeClient adds handlers to bubble up connection errors such as HTTP 403
      client = new NodeClient({
        region: AWS.config.region + '1', // <- invalid region
        credentials: AWS.config.credentials,
        endpoint: config.aws.iot.endpoint,
        clientId: 'mqtt-client-test1',
      })
      // logEventsToConsole(client)
      client.on('connect', () => {
        client.end(true)
        done(new Error('Should not have emitted connect event'))
      })
      client.on('error', err => {
        expect(err.message).toMatch(/Unexpected server response/)
        expect(err.body).toMatch(/Credential should be scoped to a valid region/)
        client.end(true, () => {
          done()
        })
      })
    })
    test('with right credentials successfully connects', done => {
      client = new NodeClient({
        region: AWS.config.region,
        credentials: AWS.config.credentials,
        endpoint: config.aws.iot.endpoint,
        clientId: 'mqtt-client-test2',
      })
      // logEventsToConsole(client)
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
