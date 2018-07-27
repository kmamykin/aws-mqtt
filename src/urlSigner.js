import v4 from 'aws-signature-v4'
import crypto from 'crypto'
// TODO: look into ./~/aws-sdk/lib/signers/v4.js

export const sign = ({ credentials, endpoint, region, expires }) => {
  return v4.createPresignedURL(
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
}
