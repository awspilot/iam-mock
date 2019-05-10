#!/usr/bin/env node
console.log("Starting iam proxy server on port 10006")

var qs = require('qs')
var AWS = require('aws-sdk')
//form_parameters = require('./src/lib/form_parameters')
const DynamodbFactory = require('@awspilot/dynamodb')
DynamodbFactory.config( {empty_string_replace_as: "\0" } );
var IamMock = require("./src/index")
var http = require('http')
var is_demo = process.env.DEMO == '1';
//var demo_tables = [ 'cities','countries' ];
//console.log("demo is ", is_demo ? 'ON' : 'OFF' )


var errorify = function( code, message ) {
	return `
<ErrorResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
  <Error>
    <Type>Sender</Type>
    <Code>` + code + `</Code>
    <Message>` + message + `</Message>
  </Error>
  <RequestId>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</RequestId>
</ErrorResponse>
	`;
}

http.createServer(function (client_req, client_res) {
	
	var body = '';
	client_req.on('data', function (data) {body += data;});
	client_req.on('end', function () {
	
		// if OPTIONS , reply with CORS '*'
		if (client_req.method === 'OPTIONS') {
			client_res.writeHead(204, {
				'Access-Control-Allow-Origin': client_req.headers['origin'] || '*',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
				'Access-Control-Allow-Headers': 'content-type, authorization, x-amz-content-sha256, x-amz-date, x-amz-target, x-amz-user-agent',
				'Access-Control-Max-Age': 2592000, // 30 days
			});
			client_res.end('');
			return;
		}
	
	
		var auth_re = /(?<algorithm>[A-Z0-9\-]+)\ Credential=(?<accesskey>[^\/]+)\/(?<unknown1>[^\/]+)\/(?<region>[^\/]+)\/([^\/]+)\/([^,]+), SignedHeaders=(?<signed_headers>[^,]+), Signature=(?<signature>[a-z0-9]+)/

		var auth = (client_req.headers['authorization'] || '') .match( auth_re );
		if (  auth === null )
			return client_res.end('Failed auth');
	
		//console.log("auth region=",auth.groups.region )
	
		var body_json = null
		try {
			body_json = qs.parse(body)
		} catch (err) {
			console.log(err)
		}

		// form_parameters.extract_param('Statistics', body_json ) - cw-mock

		//console.log("body json=", JSON.stringify(body_json, null, "\t") )

		var dbiam = new IamMock({
			table_name: 'iam_users',
		});

		if (body_json.Action === 'CreateUser') {

			dbiam.createUser({UserName: body_json.UserName,}, function( err, data ) {
				
				//console.log(err, data)
				client_res.setHeader('Content-Type', 'text/xml')
				client_res.setHeader('Access-Control-Allow-Origin', '*')
				client_res.setHeader('Access-Control-Expose-Headers', 'x-amzn-RequestId,x-amzn-ErrorType,x-amzn-ErrorMessage,Date')
				client_res.setHeader('x-amzn-RequestId', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
				
				if (err) {
					client_res.writeHead(400);
					client_res.end(errorify(err.code, err.message))
					return;
				}
				
				client_res.end(`
					<CreateUserResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
						<CreateUserResult>
							<User>
								<Path>/</Path>
								<UserName>` + data.username + `</UserName>
								<Arn>arn:aws:iam::000000000000:user/` + data.username + `</Arn>
								<UserId>` + data.user_id + `</UserId>
								<CreateDate>` + new Date(data.created_at).toISOString() + `</CreateDate>
							</User>
						</CreateUserResult>
						<ResponseMetadata>
							<RequestId>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</RequestId>
						</ResponseMetadata>
					</CreateUserResponse>
				`)
			});
			return ;
		}


		if (body_json.Action === 'DeleteUser') {
			dbiam.deleteUser({UserName: body_json.UserName,}, function( err, data ) {
				if (err) {
					client_res.writeHead(400);
					client_res.end(errorify(err.code, err.message))
					return;
				}
				
				client_res.end(`
				<DeleteUserResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
					<ResponseMetadata>
						<RequestId>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</RequestId>
					</ResponseMetadata>
				</DeleteUserResponse>
				`)
			})
		}

	});
}).listen(10006);
