import { Duplex } from 'stream'
import { toAsyncFactory, closeStreamWithError, initWebSocket, concatChunks } from './utils'

export default class WSStream extends Duplex {
  constructor(socketOrFactory) {
    super()
    this.socket = null
    const asyncSocketFactory = toAsyncFactory(socketOrFactory)
    asyncSocketFactory((err, socket) => {
      if (err) {
        closeStreamWithError(this, err)
      } else {
        this.socket = initWebSocket(this, socket)
      }
    })
  }

  // mqtt.js calls write with these values (examples):
  // chunk = [16], enc = "buffer"
  // chunk = "MQTT", enc = "utf8"
  _write(chunk, encoding, callback) {
    // console.log('_write')
    sendBufferTask(this, concatChunks([{ chunk, encoding }]), callback)() // NOTE () to execute task now
  }

  // mqtt.js uses stream.cork(), then writes bunch of small buffers, then stream.uncork()
  // Define _writev to receive all those buffers and send them all at once in one WebSocket frame
  _writev(chunks, callback) {
    // console.log('_writev', concatChunks(chunks))
    sendBufferTask(this, concatChunks(chunks), callback)() // NOTE () to execute task now
  }

  _read(size) {
    // anything to do here?
  }

  destroy() {
    // noop, but MQTT calls it on forced close
  }
}

const A_BIT_LATER = 100
// Only one sendBufferTask should be running at a time. It either re-schedules itself or completes and calls callback to resume the flow
const sendBufferTask = (stream, buffer, callback) => () => {
  if (!stream.socket) {
    // still getting URL to connect to...
    setTimeout(sendBufferTask(stream, buffer, callback), A_BIT_LATER)
    return
  }
  const socket = stream.socket
  switch (socket.readyState) {
    case socket.CONNECTING:
      // queue up until socket is opened and flushed
      setTimeout(sendBufferTask(stream, buffer, callback), A_BIT_LATER)
      break
    case socket.OPEN:
      // we are on a server, using ws.WebSocket
      socket.send(buffer, { mask: true, binary: true }, callback)
      break
    case socket.CLOSING:
      // Oops, can't write to closing socket. Discard the buffer.
      callback(new Error('Socket is closing'))
      break
    case socket.CLOSED:
      // Oops, can't write to closed socket. Discard the buffer.
      callback(new Error('Socket is closed'))
      break
    default:
    //
  }
}
