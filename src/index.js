var async = require('async')
const AWS = require('aws-sdk')

const DynamodbFactory = require('@awspilot/dynamodb')
DynamodbFactory.config( {empty_string_replace_as: "\0" } );

var DynamoDB = new DynamodbFactory(
	new AWS.DynamoDB({
		endpoint:        process.env.IAM_DYNAMODB_ENDPOINT,
		accessKeyId:     process.env.IAM_DYNAMODB_KEY,
		secretAccessKey: process.env.IAM_DYNAMODB_SECRET,
		region:          'global',
	})
)


var IAM = function( config ) {
	this.config = typeof config === "object" ? config : {}
}

var account_id = '000000000000'

IAM.prototype.create_users_table = function(cb) {
	var $this=this;
	
	DynamoDB.query(`
		CREATE PAY_PER_REQUEST TABLE ` + ($this.config.table_name || process.env.IAM_DYNAMODB_TABLE) + ` (
			account_id STRING,
			username STRING,
			PRIMARY KEY ( account_id, username )
		)
	`, function(err,data) {
		//console.log("create table => ", err, data )
		setTimeout(function() {
			if (typeof cb === "function") cb()
		},3000)
	});

}

IAM.prototype.createUser = function( params, cb ) {
	var $this = this;
	if (typeof params.UserName !== "string")
		return cb({ code: 'INVALID_USERNAME', message: 'Invalid UserName'})

		var needs_create_table = false;
		var user_id = 'AIDAWSxxxxxxxxxxxxxxx'.replace(/[x]/g, function(c) { var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8); return v.toString(16); }).toUpperCase();
		var created_at = new Date().getTime();
		async.waterfall([
			
			// step1, try to insert into db

			function( cb ) {
				DynamoDB
					.table('iam_users')
					.insert({
						account_id: account_id,
						username: params.UserName,
						user_id: user_id,
						created_at: created_at,
					}, function(err, data) {
						if (err && err.code === 'ResourceNotFoundException') {
							needs_create_table = true
							return cb()
						}
						
						if (err && err.code === 'ConditionalCheckFailedException')
							return cb({ code: 'EntityAlreadyExists', message: 'User with name ' + params.UserName + ' already exists.'})

						if ( err )
							return cb(err)

						cb()
					})
			},
			
			// create table if necessary
			function( cb ) {
				if (needs_create_table === false )
					return cb()
				
				$this.create_users_table(function() {
					cb()
				})
			},
			
			// retry user creation after create table
			function( cb ) {
				if (needs_create_table === false )
					return cb()

				DynamoDB
					.table('iam_users')
					.insert({
						account_id: account_id,
						username: params.UserName,
						user_id: user_id,
						created_at: created_at,
					}, function(err, data) {

						if (err && err.code === 'ConditionalCheckFailedException')
							return cb({ code: 'EntityAlreadyExists', message: 'User with name ' + params.UserName + ' already exists.'})

						if ( err )
							return cb(err)

						cb()
					})
			},
	
		], function(err) {
			if (err)
				return cb(err)
			
			cb(null, {
				user_id: user_id,
				username: params.UserName,
				created_at: created_at,
			})
		})

}

IAM.prototype.deleteUser = function( params, cb ) {
	var $this = this;
	if (typeof params.UserName !== "string")
		return cb({ code: 'INVALID_USERNAME', message: 'Invalid UserName'})

	var user;
	async.waterfall([
		// step1, get the user
		function( cb) {
			DynamoDB
				.table('iam_users')
				.where('account_id').eq( account_id )
				.where('username').eq(params.UserName)
				.consistent_read()
				.get(function(err,dbuser) {
					if (err)
						return cb(err)
					
					if (!Object.keys(dbuser).length)
						return cb({code: 'NoSuchEntity', message: 'The user with name ' + params.UserName + ' cannot be found.'})

					user = dbuser;
					cb()
				})
		},
		
		// step2, delete all its keys, than later reqrite this with transactions
		function(cb) {
			cb()
		},
		
		// step3, actually delete the user
		function(cb) {
			DynamoDB
				.table('iam_users')
				.where('account_id').eq( account_id )
				.where('username').eq(params.UserName)
				.delete(function(err) {
					if (err)
						return cb(err)
					
					cb()
				})
		},
		
	], function(err) {
		if (err)
			return cb(err)

		cb( null )
	})

}


module.exports = IAM;