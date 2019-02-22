module.exports = {
  logEventsToConsole: (client) => {
    client.on('connect', (connack) => console.log('CONNECT', connack))
    client.on('reconnect', () => console.log('RECONNECT'))
    client.on('close', () => console.log('CLOSE'))
    client.on('offline', () => console.log('OFFLINE'))
    client.on('error', (err) => console.error('ERROR', err))
    client.on('end', () => console.log('END'))
    client.on('message', (topic, message, packet) => console.log('MESSAGE', topic, message, packet))
    client.on('packetsend', (packet) => console.log('PACKET SEND', packet))
    client.on('packetreceive', (packet) => console.log('PACKET RECV', packet))
  }
}
