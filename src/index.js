// Only importing and exporting a browser version of client.
// For the node version, need to import the class not from index.js
// but directly from the file, e.g. require('aws-mqtt/NodeClient')
import BrowserClient from './BrowserClient'

module.exports = BrowserClient
