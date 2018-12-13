const AWS = require('aws-sdk/global')
const AWSMqttClient = require('../../lib/BrowserClient')
const config = require('../../examples/config')

// exposing globals on window to be accessed in tests (in page.evaluate(() => { window.AWS })
window.AWS = AWS
window.AWSMqttClient = AWSMqttClient.default
window.config = config

window.guestIdentityOptions = (options = {}) => {
  AWS.config.region = window.config.aws.region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: window.config.aws.cognito.identityPoolId,
  })
  return {
    region: AWS.config.region,
    credentials: AWS.config.credentials,
    endpoint: window.config.aws.iot.endpoint,
    clientId: 'mqtt-client-browser-test',
    ...options,
  }
}

window.invalidIdentityPoolOptions = (options = {}) => {
  AWS.config.region = window.config.aws.region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: window.config.aws.cognito.identityPoolId.replace(/.$/, '-'), // ending identity pool with a dash
  })
  return {
    region: AWS.config.region,
    credentials: AWS.config.credentials,
    endpoint: window.config.aws.iot.endpoint,
    clientId: 'mqtt-client-browser-test',
    ...options,
  }
}

window.invalidCredentialsOptions = (options = {}) => {
  AWS.config.region = window.config.aws.region
  AWS.config.credentials = new AWS.Credentials({
    accessKeyId: 'AKIAJGP7123E4N74XXXX',
    secretAccessKey: 'totally-invalid-secret-key+-123',
    sessionToken: null,
  })
  return {
    region: AWS.config.region,
    credentials: AWS.config.credentials,
    endpoint: window.config.aws.iot.endpoint,
    clientId: 'mqtt-client-browser-test',
    ...options,
  }
}

window.withConsoleLogging = client => {
  client.on('connect', connack =>
    console.log('CONNECT', JSON.stringify(connack))
  )
  client.on('reconnect', () => console.log('RECONNECT'))
  client.on('close', () => console.log('CLOSE'))
  client.on('offline', () => console.log('OFFLINE'))
  client.on('error', err =>
    console.log('ERROR', JSON.stringify({ message: err.message, code: err.code }))
  )
  client.on('end', () => console.log('END'))
  client.on('message', (topic, message, packet) =>
    console.log('MESSAGE', JSON.stringify({topic, message, packet}))
  )
  client.on('packetsend', packet =>
    console.log('PACKETSEND', JSON.stringify(packet))
  )
  client.on('packetreceive', packet =>
    console.log('PACKETRECV', JSON.stringify(packet))
  )
  return client
}
