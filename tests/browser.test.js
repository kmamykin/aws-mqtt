import browserContext from './browserContext'
import config from '../examples/config' // NOTE: make sure to copy config.example.js to config.js and fill in your values

jest.setTimeout(20000)

const browser = browserContext('./app')

describe('browser', () => {
  beforeAll(browser.start)

  afterAll(browser.shutdown)

  test(
    'evaluate async function',
    browser.withPage(async page => {
      await page.evaluate(async () => {
        console.log('inside async function')
        await new Promise(res => setImmediate(res))
      })
    })
  )
  test(
    'browser loaded the same config file',
    browser.withPage(async page => {
      const browserConfig = await page.evaluate(() => new Promise(resolve => resolve(window.config)))
      console.log(browserConfig)
      expect(browserConfig).toEqual(config)
    })
  )
  test(
    'successful connection to AWS',
    browser.withPage(async page => {
      const connack = await page.evaluate(
        () =>
          new Promise(resolve => {
            const client = AWSMqtt.connect(guestIdentityOptions())
            client.on('connect', connack => {
              client.end(() => {
                resolve(connack)
              })
            })
          })
      )
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
      const errorMessage = await page.evaluate(
        () =>
          new Promise(resolve => {
            const client = AWSMqtt.connect(guestIdentityOptions())
            logEventsToConsole(client)
            client.on('error', err => {
              resolve(err.message)
            })
          })
      )
      expect(errorMessage).toEqual('Network Failure')
    })
  )
  test(
    'connecting with invalid identity pool url emits pool not found error',
    browser.withPage(async page => {
      const errorMessage = await page.evaluate(
        () =>
          new Promise(resolve => {
            const client = AWSMqtt.connect(invalidIdentityPoolOptions())
            logEventsToConsole(client)
            client.on('error', err => {
              resolve(err.message)
            })
          })
      )
      expect(errorMessage).toMatch(/IdentityPool .* not found/)
    })
  )
  test(
    'connecting with invalid credentials emits connection closed error',
    browser.withPage(async page => {
      const errorMessage = await page.evaluate(
        () =>
          new Promise(resolve => {
            const client = AWSMqtt.connect(invalidCredentialsOptions())
            logEventsToConsole(client)
            client.on('error', err => {
              resolve(err.message)
            })
          })
      )
      expect(errorMessage).toMatch(/Connection was closed/)
      expect(page.getConsoleLog()[0].text).toMatch(/WebSocket connection to .* failed: Error during WebSocket handshake: Unexpected response code: 403/)
    })
  )
})
