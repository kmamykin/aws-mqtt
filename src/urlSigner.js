import v4 from 'aws-signature-v4'
import crypto from 'crypto'

export const sign = ({ credentials, endpoint, region, expires }) => {
  const payload = crypto
    .createHash('sha256')
    .update('', 'utf8')
    .digest('hex')
  return v4.createPresignedURL('GET', endpoint, '/mqtt', 'iotdevicegateway', payload, {
    key: credentials.accessKeyId,
    secret: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    protocol: 'wss',
    region: region,
    expires: expires,
  })
}
