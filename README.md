# AWS IoT MQTT client

[![NPM](https://nodei.co/npm/aws-mqtt.png?global=true)](https://nodei.co/npm/aws-mqtt/)

This module implements a client to connect to AWS IoT MQTT broker using WebSockets. 
It can be used in a browser as well as in Node.js environment.  

The main class exported from this package is a subclass of [MqttClient](https://github.com/mqttjs/MQTT.js) and exposes the same API.
What this package adds is the following:

* AWS IoT broker url signing logic
* Refreshing of credentials and re-signing url on re-connects
* Custom WebSocket stream implementation that is more efficient then out of the box mqtt.js/websocket-stream combo (this package handles corking/uncorking of the stream, whereas websocket-stream sends a separate frame per each byte written)
* Validated connection options that work with AWS MQTT broker
* Pins versions of `mqtt` and `aws-signature-v4` to a known tested combo, in the past lax version constraints broke this package
* `NodeClient` that works in node (need to install ws separately)


### Motivation 

Up until now an implementation of a realtime in-browser application required the use of either an external service 
(e.g [Pusher](https://pusher.com/), [PubNub](https://www.pubnub.com/))
or roll your own servers (e.g. using [socket.io](http://socket.io/)) that maintain connections with browsers 
and need scaling to respond to the changes in number of active users.
Using AWS IoT MQTT broker as the realtime backend provides a low cost scalable service for your application. 

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

The example below assumes the use of Babel/Webpack. `aws-sdk` now officially supports bundling with webpack, [with a few things to know](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/webpack.html).

```javascript
import AWS from 'aws-sdk/global'
import AWSMqttClient from 'aws-mqtt'
AWS.config.region = 'us-east-1' // your region
AWS.config.credentials = ... // See AWS Setup and Security below 

const client = new AWSMqttClient({
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: '...iot.us-east-1.amazonaws.com', // NOTE: get this value with `aws iot describe-endpoint`
  expires: 600, // Sign url with expiration of 600 seconds
  clientId: 'mqtt-client-' + (Math.floor((Math.random() * 100000) + 1)), // clientId to register with MQTT broker. Need to be unique per client
  will: {
      topic: 'WillMsg',
      payload: 'Connection Closed abnormally..!',
      qos: 0,
      retain: false
  } 
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

The `client` object in the above example is a subclass of MqttClient class from MQTT.js. 
For events and API see the [docs](https://github.com/mqttjs/MQTT.js#api).

### In Node.js

The same usage as in browser, but require a different module - `require('aws-mqtt/lib/NodeClient')` instead of `require('aws-mqtt')`. 
[ws](https://github.com/websockets/ws) also needs to be installed.

Install ws if you don't have it installed yet

```bash
npm install ws@^6.0.0
```

```javascript
// in node v6.x
const AWS = require('aws-sdk')
const AWSMqttClient = require('aws-mqtt/lib/NodeClient')

AWS.config.region = 'us-east-1' 
AWS.config.credentials = ... 

const client = new AWSMqttClient({
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: '...iot.us-east-1.amazonaws.com', // NOTE: get this value with `aws iot describe-endpoint`
  clientId: 'mqtt-client-' + (Math.floor((Math.random() * 100000) + 1)), // clientId to register with MQTT broker. Need to be unique per client
  will: {
    topic: 'WillMsg',
    payload: 'Connection Closed abnormally..!',
    qos: 0,
    retain: false
  } 
})

```

### In AWS Lambda functions

Creating a `NodeClient` instance will set up internal timers and the node.js process will not exit until you call `client.end()`.
This is fine if you are developing a *long running* server app that subscribes and/or publishes messages.
For ephemeral functions, such as AWS Lambda, this approach will cause the function invocation to timeout.

To publish a single message to a topic and disconnect - require `publishMessage` and use it like this:

```javascript
const AWS = require('aws-sdk')
const publishMessage = require('aws-mqtt/lib/publishMessage')

AWS.config.region = 'us-east-1' 
AWS.config.credentials = ... 

const config = {
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: '...iot.us-east-1.amazonaws.com' 
}

// publish returns a Promise
publishMessage(config, '/myTopic', 'my message').then(console.log, console.error)
```

### Using MQTT `will`

The `will` option will send a message by the broker automatically when the client disconnect badly. 
For more information of how to use it, look the [mqtt.Client](https://github.com/mqttjs/MQTT.js#mqttclientstreambuilder-options) 
option on the [MQTT.js](https://github.com/mqttjs/MQTT.js) documentation.


## AWS Setup and Security

There is an example [CloudFormation template](tests/cf-stack.yml) and [deploy script](tests/deploy.sh) to simplify 
creation of Cognito Identity Pool.

First, the required primer on [AWS JavaScript Configuration](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/configuring-the-jssdk.html).
There are multiple ways to configure AWS based on the use case. For example for usage in a web browser by un-authenticated users, the best practice is to use Cognito Identity.
When Cognito Identity Pool is created, it's assigned an IAM role that is used by un-authenticated users. 
That role needs to be given minimum required permissions (principle of least privilege). 
In the case of IoT MQTT broker, that means restricting un-authenticated user to subscribe to specific topics or publish to specific topics.
Read more on [AWS IoT Policies](http://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html).

An example of policy statement for an un-authenticated user (tweak as you see fit, note the use of `iot:ClientId` to dynamically limit the topics):
```json
{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Action": ["iot:Connect"],
        "Resource": ["*"]
    }, {
        "Effect": "Allow",
        "Action":["iot:Subscribe"],
        "Resource": ["arn:aws:iot:us-east-1:<...>:topic/foo/bar"]
    }, {
        "Effect": "Allow",
        "Action": ["iot:Publish"],
        "Resource": ["arn:aws:iot:us-east-1:<...>:topic/foo/bar/${iot:ClientId}"]
    }]
}
```

### Quick example using Cognito Identity un-authenticated users approach 

Create a Cognito Identity Pool in AWS (under Cognito Federated Identities)

![Image of Step1](https://github.com/kmamykin/aws-mqtt/raw/master/examples/IdentityPoolStep1.jpg)

Accept default create IAM roles for authenticated and un-authenticated identities 
 
![Image of Step2](https://github.com/kmamykin/aws-mqtt/raw/master/examples/IdentityPoolStep2.jpg)

Go to IAM Roles and find the role for the *un-authenticated* role created for the identity pool
 
![Image of Step3](https://github.com/kmamykin/aws-mqtt/raw/master/examples/IdentityPoolStep3.jpg)
 
Edit the inline policy to allow access to connect, subscribe and publish to IoT message broker. 
Note: the policy shown below is very open for an un-authenticated user, you can start with that to make sure things work, and then tighten it up.
 
![Image of Step4](https://github.com/kmamykin/aws-mqtt/raw/master/examples/IdentityPoolStep4.jpg)

Get the Identity Pool ID you just created:

```bash
aws cognito-identity list-identity-pools --max-results=5
```

Use the Identity Pool ID in you app credentials:

```javascript
AWS.config.region = '...' // e.g us-west-2
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: '...'
})
```

Pass `AWS.config.credentials` to AWSMqtt connect methods.  

## Examples

In `./examples` folder there are two example projects: 

* chat - The minimalistic example of using AWSMqtt in browser with Webpack
* node-publisher - contains two examples
    1. timePublisher.js - how to connect to AWS IoT MQTT broker, subscribe and publish messages
    2. publish.js - how to publish one message and disconnect, e.g. `node publish.js "/chat" Hello`

Before running any of the examples, copy `examples/config.example.js` to `examples/config.js` and fill in your values.

## Frequently asked questions

#### Memory leak

If your browser is reporting a memory leak, this could be caused by your cleanup strategy of event listeners.  By default, most browsers allow 10 event listeners to listen to a single emitting event from a singular source.  So, if you have more than 10 listeners for an event (ie `client.on('message')`, where `message` is the event), then you will get this error.  If your client is disconnecting, or reconnecting, we recommend that you cleanup the old event listeners with `client.removeAllListeners('EVENT')` (where EVENT could be `message`, or other), or `client.removeListener('EVENT', fn)`.

#### Frequently disconnecting

There are a few reasons why your client may be disconnecting unexpectedly.  Here are a few cases:

- `clientId` in the `connect` configuration MUST be unique across each client.  If clients A and B use the same clientId, then when B tries to connect, client A will get disconnected (by the broker).  Because this package attempts to reconnect you when disconnected, client A will reconnect, which will cause client B to disconnect.  And an infinite cycle ensues.  Note that `clientId`, if not passed in the config, will use `'mqtt-client-' + (Math.floor((Math.random() * 100000) + 1))` to generate a "unique" clientId.  If you are passing in clientId to override the default, make sure it is unique.
- Permissions with AWS IAM could be set up incorrectly.
