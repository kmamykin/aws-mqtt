import MqttClient from 'mqtt/lib/client'
import { sign } from './urlSigner'

// Not all MQTT options will work with AWS, here we handpick options that are safe to pass on to MQTT
const processOptions = (options = {}) => {
  return {
    WebSocket: options.WebSocket || window.WebSocket,
    aws: {
      region: options.region,
      endpoint: options.endpoint,
      credentials: options.credentials
    },
    mqttOptions: {
      clientId: options.clientId || 'mqtt-client-' + (Math.floor((Math.random() * 100000) + 1)),
      // protocolId: options.protocolId || 'MQTT',
      // protocolVersion: options.protocolVersion || 4,
      //reconnectPeriod: options.reconnectPeriod || 2 * 1000,
      //connectTimeout: options.connectTimeout || 10 * 1000,
      connectTimeout: options.connectTimeout || 5 * 1000,
      reconnectPeriod: options.reconnectPeriod || 10 * 1000,
      clean: options.clean || true, // need to re-subscribe after offline/disconnect,
      // queueQoSZero: options.queueQoSZero || true,
      will: options.will || {}
    }
  }
}

class Client extends MqttClient {
  constructor(options) {
    const { WebSocket, aws, mqttOptions } = processOptions(options)
    const streamBuilder = () => createWebSocketStream(WebSocket, aws)
    super(streamBuilder, mqttOptions)
  }
}

module.exports = Client
