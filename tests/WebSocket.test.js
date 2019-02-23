const crypto = require('crypto')
const https = require('https')
const tls = require('tls')
const WS = require('ws')

import { signedUrl } from '../src/urlSigner'
import AWS from 'aws-sdk/global'
import config from '../examples/config' // NOTE: make sure to copy config.example.js to config.js and fill in your values

// These tests ensure that the version of ws.WebSocket is compatible with the usage in this module
// and with AWS IoT WebSocket connections (connecting to a signed AWS url)
describe('WebSocket compatibility', () => {
  describe('https.get', () => {
    // This replicates the way ws.WebSocket makes initial connection,
    // which seems to fails
    test('with { createConnection: tls.connect } fails!!!', done => {
      const request = https.get({
        ...echoServer(),
        headers: webSocketHeaders(),
        createConnection: tls.connect, // This is what's being tested
      })

      request.on('upgrade', function() {
        request.abort()
        done(new Error('Should have failed here'))
      })
      request.on('error', function(err) {
        request.abort()
        // we expect this error
        expect(err.message).toMatch(/ENOTSOCK/)
        done()
      })
    })
    // But passing 'agent' option works
    test('with agent succeeds', done => {
      const agent = new https.Agent()
      const request = https.get({
        ...echoServer(),
        headers: webSocketHeaders(),
        agent: agent, // This is what's being tested
      })

      request.on('upgrade', function() {
        request.abort()
        done()
      })
      request.on('error', function(err) {
        request.abort()
        done(err)
      })
    })
  })

  describe('WebSocket connection to echo server', () => {
    test('with createConnection option', done => {
      const socket = new WS('wss://echo.websocket.org/', [], {})
      socket.on('upgrade', res => {
        res.destroy()
        done()
      })
      socket.on('error', err => {
        done(err)
      })
    })
  })

  describe('WebSocket connection to AWS MQTT server', () => {
    // Skipping: This passes with ws@6.0.0 but fails with ws@6.1.4 - so the problem tested here
    // has been fixed in ws@6.1.4
    test.skip('with no options (createConnection: tls.connect used by ws.WebSocket internally) connection fails', done => {
      const socket = new WS(awsMqttUrl(), ['mqtt'], { /* no agent passed */})
      socket.on('upgrade', res => {
        res.destroy()
        done(new Error('Expected to fail connection'))
      })
      socket.on('error', err => {
        expect(err.message).toMatch(/Unexpected server response: 403/)
        done()
      })
    })
    test('with agent option succeeds', done => {
      // This imitate the way NodeClient makes a WS connection to AWS MQTT, and should work with
      // WS v6.0.0 - v6.1.4. Passing an agent seems to be the way to make it work for both ws versions
      const agent = new https.Agent()
      const socket = new WS(awsMqttUrl(), ['mqtt'], { agent })
      socket.on('upgrade', res => {
        res.destroy()
        done()
      })
      socket.on('error', err => {
        done(err)
      })
    })
  })
})

function webSocketHeaders(overrides = {}) {
  return {
    'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
    'Sec-WebSocket-Version': 13,
    'Sec-WebSocket-Protocol': 'mqtt',
    'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
    'Connection': 'Upgrade',
    'Upgrade': 'websocket',
    ...overrides,
  }
}

function echoServer() {
  return {
    hostname: 'echo.websocket.org',
    path: '/',
    port: 443,
  }
}

function awsMqttUrl() {
  // For this to work must hace configured aws cli profile named 'aws-mqtt'
  const credentials = new AWS.SharedIniFileCredentials({ profile: 'aws-mqtt' })
  const region = 'us-east-1'
  const expires = 10000
  const endpoint = config.aws.iot.endpoint
  return signedUrl({ credentials, endpoint, region, expires })
}
