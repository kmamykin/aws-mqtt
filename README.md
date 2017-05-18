# AWS IoT MQTT client

[![NPM](https://nodei.co/npm/aws-mqtt.png?global=true)](https://nodei.co/npm/aws-mqtt/)

This module implements a client to connect to AWS IoT MQTT broker using WebSockets. 
It can be used to create serverless realtime applications that elastically scale with demand.
AWS MQTT Client can be used in browser as well as in node.js environment.  

Up until now an implementation of a realtime in-browser application required the use of either an external service 
(e.g [Pusher](https://pusher.com/), [PubNub](https://www.pubnub.com/))
or roll your own servers (e.g. using [socket.io](http://socket.io/)) that maintain connections with browsers and need scaling to respond to the changes in number of active users.
Using AWS IoT MQTT broker as the realtime backend provides a low cost automatically scaled service for your application. 

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
import AWSMqtt from 'aws-mqtt'
AWS.config.region = 'us-east-1' // your region
AWS.config.credentials = ... // See AWS Setup and Security below 

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

AWS.config.region = 'us-east-1' 
AWS.config.credentials = ... 

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

To publish a message to a topic - create a publish function through `AWSMqtt.publisher` invocation and call it with topic and message:

```javascript
const AWS = require('aws-sdk')
const AWSMqtt = require('aws-mqtt')
const WebSocket = require('ws')

AWS.config.region = 'us-east-1' 
AWS.config.credentials = ... 

const publish = AWSMqtt.publisher({
  WebSocket: WebSocket, 
  region: AWS.config.region,
  credentials: AWS.config.credentials,
  endpoint: '...iot.us-east-1.amazonaws.com' 
})

// publish returns a Promise
publish('/myTopic', 'my message').then(console.log, console.error)
```

## AWS Setup and Security

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
        "Resource": ["arn:aws:iot:us-east-1:123456789012:topic/foo/bar"]
    }, {
        "Effect": "Allow",
        "Action": ["iot:Publish"],
        "Resource": ["arn:aws:iot:us-east-1:123456789012:topic/foo/bar/${iot:ClientId}"]
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
