import MqttWebSocketStream from 'mqtt-websocket-stream'
import createUrlSigner from './createUrlSigner'

export default (WebSocket, awsOptions) => {
  const urlSigner = createUrlSigner(awsOptions)
  const webSocketFactory = (callback) => {
    urlSigner.getAndSign((err, url) => {
      if (err) return callback(err)
      console.log('Connecting to', url)
      callback(null, new WebSocket(url, ['mqttv3.1']))
    })
  }

  return new MqttWebSocketStream(webSocketFactory)
}
