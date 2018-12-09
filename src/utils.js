export const toAsyncFactory = (socketOrFactory) => {
  const continueWithError = (error) => (callback) => process.nextTick(() => callback(error))
  const continueWithValue = (value) => (callback) => process.nextTick(() => callback(null, value))
  const invalidArgsError = new Error("Must call createStream with a socket or factory function")
  if (!socketOrFactory) return continueWithError(invalidArgsError)
  if (typeof socketOrFactory === 'object') return continueWithValue(socketOrFactory)
  if (typeof socketOrFactory === 'function' && socketOrFactory.length === 0) return continueWithValue(socketOrFactory()) // for sync functions
  if (typeof socketOrFactory === 'function' && socketOrFactory.length > 0) return socketOrFactory
  return continueWithError(invalidArgsError)
}

export const concatChunks = (chunks) => {
  //chunks ::  [{ chunk: ..., encoding: ... }]
  const toBuffer = (chunk, encoding) => (encoding === 'utf8' ? Buffer.from(chunk, 'utf8') : chunk)
  const buffers = chunks.map(c => toBuffer(c.chunk, c.encoding))
  return Buffer.concat(buffers)
}

export const isBrowserSocket = (socket) => {
  return socket.send.length != 3; // send is sync in browser and async with length 3 on server using 'ws' module
}

export const initWebSocket = (stream, socket) => {
  if (isBrowserSocket(socket)) {
    // console.log('WebSocketStream: isBrowserSocket = true')
  } else {
    // console.log('WebSocketStream: isBrowserSocket = false')
  }
  socket.binaryType = 'arraybuffer'
  socket.onopen = openHandler(stream)
  socket.onclose = closeHandler(stream)
  socket.onerror = errorHandler(stream)
  socket.onmessage = messageHandler(stream)

  socket.addEventListener('unexpected-response', (req, res) => {
    // console.log('UNEXPECTED RESPONSE')
    // console.log('REQ', req.method, req.path, req._headers)
    // console.log('RES HEADERS', res.headers)
    let data = ''
    res.on('data', (chunk) => {
      // console.log('CHUNK' + chunk);
      data = data + chunk
    });
    res.on('end', () => {
      // console.log('End of response.');
      const err = new Error('Unexpected server response: ' + res.statusCode)
      err.body = data
      closeStreamWithError(stream, err)
    });
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
  // console.log('WebSocketStream onopen', evt.target.url)
  stream.emit('connect')
}

// See https://tools.ietf.org/html/rfc6455#section-7.4.1
const statusCodes = {
  1006: 'Connection was closed abnormally'
}

const closeHandler = stream => evt => {
  const { code, reason, wasClean } = evt
  // console.log('WebSocketStream onclose', evt instanceof CloseEvent, code, reason, wasClean)
  // console.log(evt.target._req)
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
  const toBuffer = (b) => (Buffer.isBuffer(b)) ? b : new Buffer(b)

  return evt => {
    // console.log('WebSocketStream onmessage', evt.data)
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
