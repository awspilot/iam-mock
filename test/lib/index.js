async = require('async')
AWS = require('aws-sdk')

// iam dynamodb
process.env.IAM_DYNAMODB_ENDPOINT="http://localhost:8000"
process.env.IAM_DYNAMODB_KEY="myKeyId"
process.env.IAM_DYNAMODB_SECRET="secretKey"
process.env.IAM_DYNAMODB_REGION="global"
process.env.IAM_DYNAMODB_TABLE ="iam_users"


cli_iam = new AWS.IAM({
	endpoint: 'http://localhost:10006/',
	region: 'us-east-1',
	credentials: {
		accessKeyId: 'myKeyId',
		secretAccessKey: 'my-lil-secret',
	}
});

