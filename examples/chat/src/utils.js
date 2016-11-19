module.exports = {
  logEventsToConsole: (client) => {
    client.on('connect', () => console.log('CONNECT'))
    client.on('offline', () => console.log('OFFLINE'))
    client.on('close', () => console.log('CLOSE'))
    client.on('error', (err) => console.error(err))
    client.on('outgoingEmpty', () => console.log('OUTGOING EMPTY'))
    client.on('reconnect', () => console.log('RECONNECT'))
    client.on('packetsend', (packet) => console.log('PACKET SEND', packet))
    client.on('packetreceive', (packet) => console.log('PACKET RECV', packet))
  }
}
