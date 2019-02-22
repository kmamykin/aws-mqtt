#!/usr/bin/env bash

STACK_NAME=mqtt-pubsub-test

aws cloudformation deploy \
    --capabilities CAPABILITY_IAM \
    --stack-name $STACK_NAME \
    --template-file ./cf-stack.yml
