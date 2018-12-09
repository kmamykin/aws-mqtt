import MqttClient from 'mqtt/lib/client'
import { sign } from './urlSigner'
import MqttWebSocketStream from 'mqtt-websocket-stream'
import https from 'https'

// Not all MQTT options will work with AWS, here we handpick options that are safe to pass on to MQTT
const processOptions = (options = {}) => {
  const { WebSocket, ...otherOptions } = options
  return {
    // for server based apps options.WebSocket needs to be set, e.g. to require('ws')
    WebSocket: WebSocket || window.WebSocket,
    aws: {
      region: options.region,
      endpoint: options.endpoint,
      credentials: options.credentials,
    },
    mqttOptions: {
      // defaults, in case the caller does not pass these values
      clientId:
        options.clientId ||
        'mqtt-client-' + Math.floor(Math.random() * 100000 + 1),
      connectTimeout: options.connectTimeout || 5 * 1000,
      reconnectPeriod: options.reconnectPeriod || 10 * 1000,
      // merge passed in options
      ...otherOptions,
      // enforce these options
      protocolId: 'MQTT', // AWS IoT supports MQTT v3.1.1
      protocolVersion: 4, // AWS IoT supports MQTT v3.1.1
      clean: options.clean || true, // need to re-subscribe after offline/disconnect,
      // queueQoSZero: options.queueQoSZero || true,
      // will: options.will || {}
      // TODO: handle will validation, passing incorrect will object (e.g. empty object with no topic defined) makes mqtt fail and never connects
    },
  }
}

const createStreamBuilder = (WebSocket, aws) => {
  return (client) => {
    const stream = new MqttWebSocketStream(function webSocketFactory(callback) {
      // console.log('In webSocketFactory')
      // Need to refresh AWS credentials, which expire after initial creation.
      // For example CognitoIdentity credentials expire after an hour
      aws.credentials.get(err => {
        if (err) return callback(err)
        // console.log('Credentials', aws.credentials)
        const url = sign({
          credentials: aws.credentials,
          endpoint: aws.endpoint,
          region: aws.region,
          expires: 10000,
        })
        // const url = sign2({
        //   host: 'awptbpmxmff21.iot.us-east-1.amazonaws.com', region: aws.region, debug: true
        // }, aws.credentials.accessKeyId, aws.credentials.secretAccessKey, aws.credentials.sessionToken)
        // console.log('Connecting to', url)
        // MUST include 'mqtt' in the list of supported protocols.
        // See http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718127
        // 'mqttv3.1' is still supported, but it is an old informal sub-protocol
        // AWS IoT message broker now supports 3.1.1, see https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html
        try {
          const agent = new https.Agent()
          const socket = new WebSocket(url, ['mqtt'], { agent })
          return callback(null, socket)
        } catch (err) {
          return callback(err, null)
        }
      })
    })
    // MQTT.js Client suppresses connection errors (?!), loosing the original error
    // This makes it very difficult to debug what went wrong.
    // Here we setup a once error handler to propagate stream error to client's error
    const propagateConnectionErrors = (err) => client.emit('error', err)
    stream.once('error', propagateConnectionErrors)
    // stream.on('connect', () => { stream.removeEventListener('error', propagateConnectionErrors)})
    // stream.on('offline', () => { stream.addEventListener('error', propagateConnectionErrors)})
    return stream
  }
}

export default class Client extends MqttClient {
  constructor(options) {
    const { WebSocket, aws, mqttOptions } = processOptions(options)
    super(createStreamBuilder(WebSocket, aws), mqttOptions)
  }
}

export const connect = options => {
  return new Client(options)
}
