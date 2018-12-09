import Client from './Client'

// Connect to broker, publish message to a topic and then disconnect
const publisher = options => (topic, message) =>
  new Promise((resolve, reject) => {
    const client = new Client(options)

    client.once('connect', () => {
      client.publish(topic, message, {}, err => {
        if (err) {
          client.end()
          reject(err)
        } else {
          client.end()
          resolve()
        }
      })
    })
    client.once('error', err => {
      client.end()
      reject(err)
    })
    client.once('offline', () => {
      client.end()
      reject(new Error('MQTT went offline'))
    })
  })

module.exports = publisher
