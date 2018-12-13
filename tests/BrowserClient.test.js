import browserContext from './browserContext'
import config from '../examples/config' // NOTE: make sure to copy config.example.js to config.js and fill in your values

jest.setTimeout(20000)

const browser = browserContext('./app')

describe('browser', () => {
  beforeAll(browser.start())

  afterAll(browser.shutdown())

  test(
    'browser loaded the same config file',
    browser.evaluate(() => new Promise(resolve => resolve(window.config))).check(browserConfig => {
      expect(browserConfig).toEqual(config)
    })
  )
  test(
    'successful connection to AWS',
    browser
      .evaluate(
        () =>
          new Promise(resolve => {
            const client = withConsoleLogging(new AWSMqttClient(guestIdentityOptions()))
            client.on('connect', connack => {
              client.end(() => {
                resolve(connack)
              })
            })
          })
      )
      .check(connack => {
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
    browser
      .init(page => page.setOfflineMode(true))
      .evaluate(
        () =>
          new Promise(resolve => {
            const client = withConsoleLogging(new AWSMqttClient(guestIdentityOptions()))
            client.on('error', err => {
              resolve(err.message)
            })
          })
      )
      .check(errorMessage => {
        expect(errorMessage).toEqual('Network Failure')
      })
  )
  test(
    'connecting with invalid identity pool url emits pool not found error',
    browser
      .evaluate(
        () =>
          new Promise(resolve => {
            const client = withConsoleLogging(new AWSMqttClient(invalidIdentityPoolOptions()))
            client.on('error', err => {
              resolve(err.message)
            })
          })
      )
      .check(errorMessage => {
        expect(errorMessage).toMatch(/IdentityPool .* not found/)
      })
  )
  test(
    'connecting with invalid credentials emits connection closed error',
    browser
      .evaluate(
        () =>
          new Promise(resolve => {
            const client = withConsoleLogging(new AWSMqttClient(invalidCredentialsOptions()))
            client.on('error', err => {
              resolve(err.message)
            })
          })
      )
      .check((errorMessage, logs) => {
        expect(errorMessage).toMatch(/Connection was closed abnormally/)
        expect(logs[0].text).toMatch(/WebSocket connection to .* failed: Error during WebSocket handshake: Unexpected response code: 403/)
      })
  )
})
