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

export const isBrowserSocket = socket => {
  return socket.send.length != 3 // send is sync in browser and async with length 3 on server using 'ws' module
}

export const initWebSocket = (stream, socket) => {
  socket.binaryType = 'arraybuffer'
  socket.onopen = openHandler(stream)
  socket.onclose = closeHandler(stream)
  socket.onerror = errorHandler(stream)
  socket.onmessage = messageHandler(stream)

  socket.addEventListener('unexpected-response', (req, res) => {
    let data = ''
    res.on('data', chunk => {
      data = data + chunk
    })
    res.on('end', () => {
      const err = new Error('Unexpected server response: ' + res.statusCode)
      err.body = data
      closeStreamWithError(stream, err)
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

const openHandler = stream => evt => {
  stream.emit('connect')
}

// See https://tools.ietf.org/html/rfc6455#section-7.4.1
const statusCodes = {
  1006: 'Connection was closed abnormally',
}

const closeHandler = stream => evt => {
  const { code, reason, wasClean } = evt
  if (!wasClean) {
    const message = reason || statusCodes[code] || 'Connection closed with code ' + code
    console.log('close message', message)
    const err = new Error(message)
    err.code = code
    err.msg = message
    stream.emit('error', err)
  }
  stream.emit('close') // as a Readable, when socket is closed, indicate to consumers no more data is coming
}

const errorHandler = stream => evt => {
  const err = evt.error || evt // ws.WebSocket has evt.error, native WebSocket emits an error
  // console.log('WebSocketStream onerror', JSON.stringify(evt), evt instanceof ErrorEvent, evt.colno, evt.error, evt.message)
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
