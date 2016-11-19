import MqttWebSocketStream from 'mqtt-websocket-stream'
import createUrlSigner from './createUrlSigner'

export default (WebSocket, awsOptions) => {
  const urlSigner = createUrlSigner(awsOptions)
  const createWebSocketWithCredentials = (callback) => {
    urlSigner.getAndSign({ expiration: 15 }, (err, url) => {
      if (err) return callback(err)
      console.log('Connecting to', url)
      callback(null, new WebSocket(url, ['mqttv3.1']))
    })
  }

  return new MqttWebSocketStream(createWebSocketWithCredentials)
}
