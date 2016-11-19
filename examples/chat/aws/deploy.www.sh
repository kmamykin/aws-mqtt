STACK_NAME=www
AWS_PROFILE=amare-admin
aws cloudformation update-stack \
    --stack-name $STACK_NAME \
    --template-body file://./StaticWebSite.yml \
    --parameters ParameterKey=DomainName,ParameterValue=www.savant.tv ParameterKey=HostedZone,ParameterValue=savant.tv \
    --profile $AWS_PROFILE \
    --capabilities CAPABILITY_IAM
aws cloudformation wait stack-update-complete --profile $AWS_PROFILE --stack-name $STACK_NAME
