import { Duplex } from 'stream'
import { toAsyncFactory, isBrowserSocket, closeStreamWithError, initWebSocket, concatChunks } from './utils'

class WebSocketStream extends Duplex {
  constructor(socketOrFactory) {
    super()
    this.socket = null
    const asyncSocketFactory = toAsyncFactory(socketOrFactory)
    asyncSocketFactory((err, socket) => {
      if (err) {
        // console.log('ERR, NO SOCKET', err)
        closeStreamWithError(this, err)
      } else {
        // console.log('GOT SOCKET')
        this.socket = initWebSocket(this, socket)
      }
    })
  }

  // mqtt.js call write with these values (examples):
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
    // console.log('sendBufferTask running... no socket yet')
    setTimeout(sendBufferTask(stream, buffer, callback), A_BIT_LATER)
    return
  }
  const socket = stream.socket
  // console.log('sendBufferTask running...', 'socket.readyState', socket.readyState, 'socket.bufferedAmount', socket.bufferedAmount)
  switch (socket.readyState) {
    case socket.CONNECTING:
      // queue up until socket is opened and flushed
      setTimeout(sendBufferTask(stream, buffer, callback), A_BIT_LATER)
      break
    case socket.OPEN:
      // determine if we are dealing with browser version of socket.send (sync) or ws version of socket.send (async)
      if (isBrowserSocket(socket)) {
        // we are in a browser
        if (socket.bufferedAmount === 0) {
          // only send data when nothing is buffered. All buffering is handled by the stream.
          // Until callback is called, all data written to the stream will be buffered internally
          try {
            // socket.send() will sync append data to an internal socket buffer and increment socket.bufferedAmount
            socket.send(buffer)
            // We are done here. The data will either be sent over the network, or onerror event raised
            return callback()
          } catch (err) {
            // Oops, rare but possible error writing to internal socket buffer
            return callback(err)
          }
        } else {
          // queue up until socket is opened and flushed
          setTimeout(sendBufferTask(stream, buffer, callback), A_BIT_LATER)
        }
      } else {
        // we are on a server, using ws.WebSocket
        // console.log('we are on a server, using ws.WebSocket', buffer)
        return socket.send(buffer, { mask: true, binary: true }, callback)
      }
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

module.exports = WebSocketStream
