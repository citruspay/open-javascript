var http = require('http');
var https = require('https');
var fs = require('fs');
var querystring = require('querystring');
var crypto = require('crypto');
var async = require('async');

var envs = {
	production: {
		protocol: https,
		hostname: 'admin.citruspay.com',
		port: 443,
		root: ''
	},
	local: {
		protocol: http,
		hostname: 'localhost',
		port: 8080,
		root: '/admin-site'		
	}
};

var env = envs.local;

http.createServer(function(req, res) {
	console.log(req.url);

	switch (req.url) {
		case '/':
		case '/index.html':
			wallet(
				'foo@bar.com',
				'884422006600',
				function(err, token) {
					if (err) {
						res.status = 500;
						res.end(err);
					} else {
						res.end(checkout(token));
					}
				}
			);
			break;
		case '/citrus.js':
			resource('../../lib' + req.url, res);
			break;
		case '/jquery.min.js':
		case '/jquery.payment.js':
			resource('..' + req.url, res);
			break;
		case '/pg/response':
			var body = '';
			req.on('data', function(data) { body += data; });
			req.on('end', function() { res.end(body); });
			break;
		default:
			resource('.' + req.url, res);
			break;
	}

}).listen(8420);

function resource(path, response) {
	try {
		fs.readFile(
			fs.realpathSync(path), 
			function(err, data) {
				if (err) {
					console.log(err);
					response.statusCode = 404;
					response.end();
				} else {
					response.end(data);
				}
			}
		);
	} catch (x) {
		response.status = 404;
		response.end();
	}
}

function checkout(token) {
	// read template
	var template = fs.readFileSync(fs.realpathSync('template.html'));
	template = String.fromCharCode.apply(String, template);

	// generate bill
	var bill = {
		merchantAccessKey: 'LY80PJEZK5TDFWKATHTL',
		merchantTxnId: generateMtx(),
		amount: {
			currency: 'INR',
			value: Math.floor(1 + 1000 * Math.random())
		},
		returnUrl: 'http://localhost:8420/pg/response',
		
		userDetails: {
			firstName: 'urie',
			lastName: 'reui',
			email: 'urie@notthere.dk',
			mobileNo: '9988776655',
			address: {
				street1: 'nice house',
				street2: 'church street',
				city: 'ramlupi',
				zip: '1254',
				state: 'rolloland',
				country: 'reuna'
			}
		},
		
		customParameters: {
			paramOne: 'one value',
			extension: 'online'
		}
	};

	// generate page
	var page = template.replace(
		/#{bill}/g, 
		JSON.stringify(sign(bill, '647c4c37ce8d84d09c83f836faf97aae722e716a')));
	page = page.replace(
		/#{token}/g,
		token);

	// return page
	return page;
}

function generateMtx() {
	return Math.floor(1 + 100000000 * Math.random()).toString();
}

function sign(bill, key) {
	// create data load
	var data = 'merchantAccessKey=' + bill.merchantAccessKey
		+ '&transactionId=' + bill.merchantTxnId
		+ '&amount=' + bill.amount.value;

	// generate hmac
	var hmac = crypto.createHmac('sha1', key);
	hmac.update(data);

	// sign bill
	bill.requestSignature = hmac.digest('hex');
	return bill;
}

function oauth(client, callback) {
	var token = env.protocol.request(
		{
			hostname: env.hostname,
			port: env.port,
			method: 'POST',
			path: env.root + '/oauth/token',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
		},
		function(res) {
			var body = '';
			res.on('data', function(data) { body += data; });
			res.on('end', function() {
				if (res.statusCode == 200) {
					callback(null, JSON.parse(body));
				} else {
					callback(body);
				}
			})
		}
	);
	token.write(querystring.stringify(client));
	token.end();
}

var subscription = async.memoize(function(callback) {
	oauth(
		{
			client_id: 'redbus-web-subscription',
			client_secret: 'e6cb285ef1bbe1c003ecb7709badda91',
			grant_type: 'implicit'
		},
		callback
	);
});

function bind(email, mobile, callback) {
	subscription(function(err, sub) {
		// fail first
		if (err) {
			callback(err);
			return;
		}

		// call bind
		var bind = env.protocol.request(
			{
				hostname: env.hostname,
				port: env.port,
				method: 'POST',
				path: env.root + '/service/v2/identity/bind',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': 'Bearer ' + sub.access_token
				}
			},
			function(res) {
				var body = '';
				res.on('data', function(data) { body += data; });
				res.on('end', function() {
					if (res.statusCode == 200) {
						callback(null, JSON.parse(body));
					} else {
						callback(body);
					}
				});
			}
		);
		bind.write(querystring.stringify({ email: email, mobile: mobile }));
		bind.end();
	});
}

function wallet(email, mobile, callback) {
	bind(
		email,
		mobile,
		function(error, user) {
			// fail first
			if (error) {
				callback(error);
				return;
			}

			// get oauth token
			oauth(
				{
					client_id: 'redbus-web-userwallet',
					client_secret: '089ac389483e1cfce403fa54c19382c8',
					grant_type: 'username',
					username: user.username
				},
				function(error, token) {
					if (error) {
						callback(error);
					} else {
						callback(null, token.access_token);
					}
				}
			);
		}
	);
}
