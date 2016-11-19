import v4 from 'aws-signature-v4'
import crypto from 'crypto'

export default ({ region, endpoint, credentials }) => {
  const sign = ({ credentials, expiration }) => {
    let url = v4.createPresignedURL(
      'GET',
      endpoint,
      '/mqtt',
      'iotdevicegateway',
      crypto.createHash('sha256').update('', 'utf8').digest('hex'),
      {
        key: credentials.accessKeyId,
        secret: credentials.secretAccessKey,
        region,
        expiration,
        protocol: 'wss'
      }
    )
    if (credentials.sessionToken) {
      url += '&X-Amz-Security-Token=' + encodeURIComponent(credentials.sessionToken)
    }
    return url
  }

  return {
    getAndSign: ({ expiration = 15 }, callback) => {
      credentials.get((err) => {
        if (err) return callback(err)
        const url = sign({credentials, expiration})
        callback(null, url)
      })
    }
  }
}

