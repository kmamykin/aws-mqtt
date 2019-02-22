import MqttClient from 'mqtt/lib/client'
import { sign } from './urlSigner'
import MqttWebSocketStream from './streams/WebSocketStream'
import processOptions from './processOptions'

const createStreamBuilder = aws => {
  return client => {
    const stream = new MqttWebSocketStream(callback => {
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
        // MUST include 'mqtt' in the list of supported protocols.
        // See http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718127
        // 'mqttv3.1' is still supported, but it is an old informal sub-protocol
        // AWS IoT message broker now supports 3.1.1, see https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html
        try {
          const socket = new window.WebSocket(url, ['mqtt'])
          return callback(null, socket)
        } catch (err) {
          return callback(err, null)
        }
      })
    })
    // MQTT.js Client suppresses connection errors (?!), loosing the original error
    // This makes it very difficult to debug what went wrong.
    // Here we setup a once error handler to propagate stream error to client's error
    const propagateConnectionErrors = err => client.emit('error', err)
    stream.once('error', propagateConnectionErrors)
    return stream
  }
}

export default class BrowserClient extends MqttClient {
  constructor(options) {
    const { aws, mqttOptions } = processOptions(options)
    super(createStreamBuilder(aws), mqttOptions)
  }
}
