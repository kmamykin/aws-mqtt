// Not all MQTT options will work with AWS, here we handpick options that are safe to pass on to MQTT
export default (options = {}) => {
  const { region, endpoint, credentials, expires, ...otherOptions } = options
  return {
    aws: {
      region,
      endpoint,
      credentials,
      expires: expires || 60, // 60 sec default expiration
    },
    mqttOptions: {
      // merge passed in options
      ...otherOptions,
      // defaults, in case the caller does not pass these values
      clientId:
        options.clientId ||
        'mqtt-client-' + Math.floor(Math.random() * 100000 + 1),
      connectTimeout: options.connectTimeout || 5 * 1000,
      reconnectPeriod: options.reconnectPeriod || 10 * 1000,
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
