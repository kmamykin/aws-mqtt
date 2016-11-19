# AWS Frontend Reference App

## Features

* Serverless, all code compiled and served from S3/CloudFormation
* Cognito authentication
* Controlled access to AWS resources for guest users
* CloudFormation stack deployment
* Real Time using AWS IoT PUB/SUB MQTT over Web Sockets (no servers!)


## Upcoming

* Authentication with external prividers and email (passwordless)
* Add Cognito resources to CloudFormation stack (need Custom Resources)
* Add CloudFront distribution with SSL
* Add CloudTrail/CloudWatch resources
* Invoke Lambda function directly from front-end code (No API Gateway)

# Not Included

* Elaborate webpack config for multiple environments
* Choice of JS framework


## TODO

* Fix MQTT buildStream function to be async, needed to get new credentials/signed url for WebSockets connection

## Credits

* @stesie for initial idea and proof of concept
    * http://stesie.github.io/2016/04/aws-iot-pubsub
    * https://gist.github.com/stesie/dabc9236ef8fc4123609f9d81df6ccd8
* @jimmyn for https://github.com/jimmyn/aws-mqtt-client
