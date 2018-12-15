import browserContext from './browserContext'
import config from '../examples/config' // NOTE: make sure to copy config.example.js to config.js and fill in your values
import { createPublisher, NodeClient } from '../src'
import AWS from 'aws-sdk/global'

jest.setTimeout(10000)

const browser = browserContext('./app')

describe('browser', () => {
  beforeAll(browser.start())

  afterAll(browser.shutdown())

  test(
    'browser loaded the same config file',
    browser.withPage(async page => {
      const browserConfig = await page.evaluate(() => new Promise(resolve => resolve(window.config)))
      expect(browserConfig).toEqual(config)
    })
  )
  test(
    'successful connection to AWS',
    browser.withPage(async page => {
      const connack = await page.evaluate(() => {
        return new Promise(resolve => {
          const client = withConsoleLogging(new AWSMqttClient(guestIdentityOptions()))
          client.on('connect', connack => {
            client.end(() => {
              resolve(connack)
            })
          })
        })
      })
      expect(connack).toMatchObject({
        cmd: 'connack',
        dup: false,
        length: 2,
        payload: null,
        qos: 0,
        retain: false,
        returnCode: 0,
        sessionPresent: false,
        topic: null,
      })
    })
  )
  test(
    'connecting in offline mode emits network failure error',
    browser.withPage(async page => {
      page.setOfflineMode(true)
      const errorMessage = await page.evaluate(() => {
        return new Promise(resolve => {
          const client = withConsoleLogging(new AWSMqttClient(guestIdentityOptions()))
          client.on('error', err => {
            resolve(err.message)
          })
        })
      })
      expect(errorMessage).toEqual('Network Failure')
    })
  )
  test(
    'connecting with invalid identity pool url emits pool not found error',
    browser.withPage(async page => {
      const errorMessage = await page.evaluate(() => {
        return new Promise(resolve => {
          const client = withConsoleLogging(new AWSMqttClient(invalidIdentityPoolOptions()))
          client.on('error', err => {
            resolve(err.message)
          })
        })
      })
      expect(errorMessage).toMatch(/IdentityPool .* not found/)
    })
  )
  test(
    'connecting with invalid credentials emits connection closed error',
    browser.withPage(async (page, consoleEntries) => {
      const connectionError = await page.evaluate(() => {
        return new Promise(resolve => {
          const client = withConsoleLogging(new AWSMqttClient(invalidCredentialsOptions()))
          client.on('error', err => {
            resolve(err.message)
          })
        })
      })
      expect(connectionError).toMatch(/Connection was closed abnormally/)
      expect(consoleEntries(0).text).toMatch(/WebSocket connection to .* failed: Error during WebSocket handshake: Unexpected response code: 403/)
    })
  )
  test(
    'sending a message from server to client',
    browser.withPage(async (page) => {
      const topic = '/chat'
      await page.evaluate(topic => {
        return new Promise(resolve => {
          window.messages = []
          const client = withConsoleLogging(new AWSMqttClient(guestIdentityOptions()))
          client.on('connect', () => {
            client.subscribe(topic)
            client.on('message', (t, message) => {
              window.messages.push(message.toString())
            })
            resolve()
          })
        })
      }, topic)
      const publish = createPublisher(nodeClientOptions(config))
      publish(topic, 'message from server')
      await page.waitForFunction(() => window.messages.length > 0, { polling: 100, timeout: 3000 })
      const messages = await page.evaluate(() => {
        return new Promise(resolve => {
          resolve(window.messages)
        })
      })
      expect(messages).toEqual(['message from server'])
    })
  )
  test(
    'sending a message from client to server',
    browser.withPage(async (page) => {
      const topic = '/chat'
      const messages = []

      const client = new NodeClient(nodeClientOptions(config))
      client.on('connect', () => {
        client.subscribe(topic)
        client.on('message', (t, message) => {
          messages.push(message.toString())
          client.end()
        })
      })

      await page.evaluate(topic => {
        return new Promise(resolve => {
          const client = withConsoleLogging(new AWSMqttClient(guestIdentityOptions()))
          client.on('connect', () => {
            client.publish(topic, 'message from client')
            resolve()
          })
        })
      }, topic)

      await sleep(1000)

      expect(messages).toEqual(['message from client'])
    })
  )
})

const nodeClientOptions = (config, options = {}) => {
  AWS.config.region = config.aws.region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: config.aws.cognito.identityPoolId,
  })
  return {
    region: AWS.config.region,
    credentials: AWS.config.credentials,
    endpoint: config.aws.iot.endpoint,
    clientId: 'mqtt-client-node-test',
    ...options,
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
