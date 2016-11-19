# AWS IoT MQTT client

[![NPM](https://nodei.co/npm/aws-mqtt.png?global=true)](https://nodei.co/npm/aws-mqtt/)

This module implements a client to connect to AWS IoT MQTT broker using WebSockets. 
It can be used to create serverless realtime pub/sub applications that elastically scale with demand.
AWS MQTT Client can used in a browser as well as in a node.js environment.  

Up until now an implementation of a realtime in-browser application required the use of either an external service 
(such as [Pusher](https://pusher.com/), [PubNub](https://www.pubnub.com/) and such)
or roll your own servers (e.g. using socket.io) that maintain connections with connected browsers and need scaling to respond to the changes in traffic.
Using AWS IoT MQTT broker as the realtime backend provides a low cost, automatically scaled service for your application. 

Internally the module signs the Web Socket url to connect to with AWS credentials, and re-signs it every time the client went offline and reconnecting.

### Disclaimer

AWS documentation does not explicitly promote the use of IoT MQTT broker as a general purpose pub/sub broker. 
Only the use case of IoT devices communication is explicitly described. While technically there is nothing preventing
general purpose browsers and servers connecting to the broker (such as implemented by this library), AWS may change its terms of service
or implement some broker constraints to prevent such use case. Use at your own risk.

## Usage

`npm install aws-sdk aws-mqtt --save`

when using in a node environment (not browser), install WebSocket implementation, e.g. `ws`

`npm install ws --save`

### In Browser

The example below assumes the use of Babel/Webpack.

```javascript
import AWS from 'aws-sdk/global'
import AWSMqtt from 'aws-mqtt'
AWS.config.region = 'us-east-1' // your region
AWS.config.credentials = ... // See Security regarding which credentials to use

const client = AWSMqtt.connect({
  WebSocket: window.WebSocket, 
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: '...iot.us-east-1.amazonaws.com', // NOTE: get this value with `aws iot describe-endpoint`
  clientId: 'mqtt-client-' + (Math.floor((Math.random() * 100000) + 1)), // clientId to register with MQTT broker. Need to be unique per client
})

client.on('connect', () => {
  client.subscribe('/myTopic')
})
client.on('message', (topic, message) => {
  console.log(topic, message)
})
client.on('close', () => {
  // ...
})
client.on('offline', () => {
  // ...
})
```
The `client` object in the above example is an instance of MqttClient from MQTT.js. For events and API see the [docs](https://github.com/mqttjs/MQTT.js#api).

### In Node.js

The same usage as in browser, but need to pass the constructor function for WebSocket in the options. [ws](https://github.com/websockets/ws) is recommented.

```javascript
// in node v6.x
const AWS = require('aws-sdk')
const AWSMqtt = require('aws-mqtt')
const WebSocket = require('ws')

AWS.config.region = 'us-east-1' // your region
AWS.config.credentials = ... // See Security regarding which credentials to use

const client = AWSMqtt.connect({
  WebSocket: WebSocket, 
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: '...iot.us-east-1.amazonaws.com', // NOTE: get this value with `aws iot describe-endpoint`
  clientId: 'mqtt-client-' + (Math.floor((Math.random() * 100000) + 1)), // clientId to register with MQTT broker. Need to be unique per client
})

```

Note, that `AWSMqtt.connect`, the returns MqttClient, which sets up internal timers and the node.js instance will not exit until you call `client.end()`.
This is fine if you are developing a *long running* server app that subscribes and/or publishes messages.
For ephemeral functions, such as AWS Lambda, this approach will cause the function invocation to timeout. 

In such use cases, it needed to use `AWSMqtt.publisher` method like this:

```javascript
const AWS = require('aws-sdk')
const AWSMqtt = require('aws-mqtt')
const WebSocket = require('ws')

AWS.config.region = 'us-east-1' // your region
AWS.config.credentials = ... // See Security regarding which credentials to use

const publish = AWSMqtt.publisher({
  WebSocket: WebSocket, 
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: '...iot.us-east-1.amazonaws.com' 
})


publish('/myTopic', 'my message').then(console.log, console.error)
```

## AWS Setup

### Security

## Examples

In `./examples` folder there are two example projects: 
    * chat - The minimalistic example of using AWSMqtt in browser with Webpack
    * node-publisher - contains two examples
        1. timePublisher.js - how to connect to AWS IoT MQTT broker, subscribe and publish messages
        2. publish.js - how to publish one message and disconnect
