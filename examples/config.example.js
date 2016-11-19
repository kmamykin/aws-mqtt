module.exports = {
  aws: {
    region: '...', // e.g. us-east-1
    iot: {
      endpoint: '...', // NOTE: get this value with `aws iot describe-endpoint`
    },
    cognito: {
      // Get it by running
      // aws cognito-identity list-identity-pools --max-results=5
      // {
      //   "IdentityPools": [
      //   {
      //     "IdentityPoolId": "<use this value>",
      //     "IdentityPoolName": <some name>
      //   }
      // ]
      // }
      identityPoolId: 'us-east-1:24512319-ac0d-44c5-a62f-3324768be3bd'
    }
  },
  topics: {
    time: '/time',
    chat: '/chat'
  }
}
