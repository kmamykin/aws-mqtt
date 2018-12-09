const https = require('https')

export const fetch = url =>
  new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = ''

        // A chunk of data has been recieved.
        res.on('data', chunk => {
          data += chunk
        })

        // The whole response has been received. Print out the result.
        res.on('end', () => {
          const body = data.length > 0 ? data : ''
          if (res.statusCode < 300) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body,
            })
          } else {
            const err = new Error('HTTP error')
            err.status = res.statusCode
            err.headers = res.headers
            err.body = body
            reject(err)
          }
        })
      })
      .on('error', err => {
        err.status = res.statusCode
        err.headers = res.headers
        err.body = JSON.parse(data)
        reject(err)
      })
  })

export const logEventsToConsole = client => {
  client.on('connect', connack => console.log('CONNECT', connack))
  client.on('reconnect', () => console.log('RECONNECT'))
  client.on('close', () => console.log('CLOSE'))
  client.on('offline', () => console.log('OFFLINE'))
  client.on('error', err => console.error('ERROR', err))
  client.on('end', () => console.log('END'))
  client.on('message', (topic, message, packet) =>
    console.log('MESSAGE', topic, message, packet)
  )
  client.on('packetsend', packet => console.log('PACKET SEND', packet))
  client.on('packetreceive', packet => console.log('PACKET RECV', packet))
}
