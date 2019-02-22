export const toAsyncFactory = socketOrFactory => {
  const continueWithError = error => callback => process.nextTick(() => callback(error))
  const continueWithValue = value => callback => process.nextTick(() => callback(null, value))
  const invalidArgsError = new Error('Must call createStream with a socket or factory function')
  if (!socketOrFactory) return continueWithError(invalidArgsError)
  if (typeof socketOrFactory === 'object') return continueWithValue(socketOrFactory)
  if (typeof socketOrFactory === 'function' && socketOrFactory.length === 0) return continueWithValue(socketOrFactory()) // for sync functions
  if (typeof socketOrFactory === 'function' && socketOrFactory.length > 0) return socketOrFactory
  return continueWithError(invalidArgsError)
}

export const concatChunks = chunks => {
  //chunks ::  [{ chunk: ..., encoding: ... }]
  const toBuffer = (chunk, encoding) => (encoding === 'utf8' ? Buffer.from(chunk, 'utf8') : chunk)
  const buffers = chunks.map(c => toBuffer(c.chunk, c.encoding))
  return Buffer.concat(buffers)
}

export const initWebSocket = (stream, socket) => {
  socket.binaryType = 'arraybuffer'
  socket.onopen = openHandler(stream, socket)
  socket.onclose = closeHandler(stream)
  socket.onerror = noopHandler()
  socket.onmessage = messageHandler(stream)

  // This event is only used for WS socket not the native WebSocket
  socket.addEventListener('unexpected-response', (req, res) => {
    let data = ''
    res.on('data', chunk => {
      data = data + chunk
    })
    res.on('end', () => {
      const err = new Error('Unexpected server response: ' + res.statusCode)
      err.body = data
      // console.log('unexpected-response handler', res.statusCode, data)
      stream.emit('error', err)
      // IMPORTANT: first emit error, THEN socket.close, otherwise socket.close will emit its own generic error
      // and our more informative err will never be seen
      socket.close()
    })
  })

  stream.on('finish', streamFinishHandler(socket))
  stream.on('close', streamCloseHandler(socket))
  return socket
}

export const closeStreamWithError = (stream, err) => {
  stream.emit('error', err)
  stream.emit('close')
}

const openHandler = (stream, socket) => evt => {
  socket.onerror = errorHandler(stream)
  stream.emit('connect')
}

// See https://tools.ietf.org/html/rfc6455#section-7.4.1
const statusCodes = {
  1006: 'Connection was closed abnormally',
}

const closeHandler = stream => evt => {
  const { code, reason, wasClean } = evt
  // console.log('WebSocketStream closeHandler:', code, reason, wasClean)
  if (!wasClean) {
    const message = reason || statusCodes[code] || 'Connection closed with code ' + code
    const err = new Error(message)
    err.code = code
    err.msg = message
    stream.emit('error', err)
  }
  stream.emit('close') // as a Readable, when socket is closed, indicate to consumers no more data is coming
}

const noopHandler = () => evt => {
}

const errorHandler = stream => evt => {
  const err = evt.error || evt // ws.WebSocket has evt.error, native WebSocket emits an error
  // console.log('WebSocketStream onerror', err, evt.error, evt.message)
  // stream.emit('error', err)
}

const messageHandler = stream => {
  const toBuffer = b => (Buffer.isBuffer(b) ? b : Buffer.from(b))

  return evt => {
    stream.push(toBuffer(evt.data))
  }
}
const streamFinishHandler = socket => () => {
  if (socket.readyState === socket.OPEN) {
    socket.close()
  }
}
const streamCloseHandler = socket => () => {
  if (socket.readyState === socket.OPEN) {
    socket.close()
  }
}
