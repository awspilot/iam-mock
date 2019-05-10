describe('init', function () {
	it('waiting for iam server to start', function(done) {
		setTimeout(function() {
			done()
		},1000)
	})
	it('CreateUser', function(done) {
		cli_iam.createUser({UserName: 'iuzer',}, function(err,data) {
			if (err)
				throw err;
			done()
		} );
	})

	it('CreateUser(duplicate)', function(done) {
		cli_iam.createUser({UserName: 'iuzer',}, function(err,data) {
			if (err && err.code === 'EntityAlreadyExists')
				return done()
			
			if (err)
				throw err;

			throw 'should have thrown EntityAlreadyExists'
		} );
	})

	it('DeleteUser', function(done) {
		cli_iam.deleteUser({UserName: 'iuzer',}, function(err,data) {
			if (err)
				throw err;

			done()
		} );
	})
})