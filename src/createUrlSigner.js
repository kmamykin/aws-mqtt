import v4 from 'aws-signature-v4'
import crypto from 'crypto'

export default ({ region, endpoint, credentials }) => {
  const sign = ({ credentials, expires }) => {
    let url = v4.createPresignedURL(
      'GET',
      endpoint,
      '/mqtt',
      'iotdevicegateway',
      crypto.createHash('sha256').update('', 'utf8').digest('hex'),
      {
        key: credentials.accessKeyId,
        secret: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
        protocol: 'wss',
        region: region,
        expires: expires
      }
    )
    return url
  }

  return {
    getAndSign: (callback) => {
      const expires = 60 // seconds
      credentials.get((err) => {
        if (err) return callback(err)
        const url = sign({ credentials, expires })
        callback(null, url)
      })
    }
  }
}

