#!/usr/bin/env node

var restler = require('restler');
var http = require('http');
var fs = require('fs');
var url = require('url');
var querystring = require('querystring');
var child_process = require('child_process');
var spawn = child_process.spawn;

//
// spapi.js
//

function getUserHome() {
	return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

var CONFIG_FILE =  getUserHome() + '/.spapi';
var CLIENT_ID = 'c614fc4ada15410b8fe5823530e92052';
var CLIENT_SECRET = '793a48ce04af4a8f8ab8e2911e199a01';
var PORT = 34567;
var REDIRECT_URI = 'http://127.0.0.1:' + PORT;
var ACCOUNTS_URL = '';
var DEFAULT_SCOPES = [
	'user-read-private',
	'user-read-email',
	'playlist-read',
	'playlist-read-private'
];
var DEFAULT_ROOT = 'https://api.spotify.com';
var DEFAULT_VERSION_PREFIX = '/v1';

function getState() {
	if (!fs.existsSync(CONFIG_FILE)) {
		return {};
	}
	var ts = fs.readFileSync(CONFIG_FILE, 'UTF-8');
	var ts2 = JSON.parse(ts);
	return ts2;
}

function putState(data) {
	var data2 = JSON.stringify(data);
	fs.writeFileSync(CONFIG_FILE, data2, 'UTF-8');
}

function getLastAccessToken() {
	var state = getState();
	return state.access_token || '';
}

function getLastRefreshToken() {
	var state = getState();
	return state.refresh_token || '';
}

function setLastAccessToken(accessToken) {
	var state = getState();
	state.access_token = accessToken;
	putState(state);
}

function setLastRerfreshToken(refreshToken) {
	var state = getState();
	state.refresh_token = refreshToken;
	putState(state);
}

function syntax() {
	console.log('SPAPI - Commandline WebAPI Interface.');
	console.log('');
	console.log('Syntax:');
	console.log('\tspapi [command] {arguments ...}');
	console.log('');
	console.log('Examples:');
	console.log('\tspapi authorize');
	console.log('\t\tRequest access with default scopes');
	console.log('');
	console.log('\tspapi authorize user-read-email,playlist-read');
	console.log('\t\tRequest access with a specific set of scopes');
	console.log('');
	console.log('\tspapi refresh');
	console.log('\t\tRefresh access token using last refresh token');
	console.log('');
	console.log('\tspapi curl https://api.spotify.com/v1/me');
	console.log('\t\tGet information about the currently authenticated user');
	console.log('');
	console.log('\tspapi curl /users/{username}/playlists');
	console.log('\t\tGet a list of a users playlists');
	console.log('');
}

function getLoginURL(scopes) {
	return 'https://accounts.spotify.com/authorize?client_id=' + CLIENT_ID
		+ '&redirect_uri=' + encodeURIComponent(REDIRECT_URI)
		+ '&scope=' + encodeURIComponent(scopes.join(' '))
		+ '&response_type=code';
}

function getAccessToken(authorization_code, callback) {
	// console.log('Exchange authorization code for access-/refresh-tokens');
	// console.log('Authorization code: ' + authorization_code);
	restler.post('https://accounts.spotify.com/api/token', {
		data: {
			'grant_type': 'authorization_code',
			'code': authorization_code,
			'redirect_uri': REDIRECT_URI
		},
		headers: {
			'Authorization': 'Basic '
				+ new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
		}
	}).on('complete', function(data) {
		// var data2 = JSON.parse(data);
		// console.log('posten klar', data);
		callback(data.access_token, data.refresh_token);
	});
}

function refreshAccessToken(refresh_token, callback) {
	// console.log('Exchange authorization code for access-/refresh-tokens');
	// console.log('Authorization code: ' + authorization_code);
	restler.post('https://accounts.spotify.com/api/token', {
		data: {
			'grant_type': 'refresh_token',
			'refresh_token': refresh_token,
		},
		headers: {
			'Authorization': 'Basic '
				+ new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
		}
	}).on('complete', function(data) {
		// var data2 = JSON.parse(data);
		// console.log('posten klar', data);
		callback(data.access_token);
	});
}

function startLoginServer(codecallback) {
	var server = http.createServer(function (req, res) {
		var url_request = url.parse(req.url).query;
		// console.log('url_request', url_request);
		var query = querystring.parse(url_request);
		// console.log('got query', query);
		if (query && query.code) {
			codecallback(query.code);
			res.writeHead(200, {'Content-Type': 'text/html'});
		}
		res.end('Thanks! you may now close this window. '
			+ '<script type="text/javascript">window.close();</script>');
		if (query && query.code) {
			server.close();
		}
	});
	console.log('Waiting for callback to ' + REDIRECT_URI);
	server.listen(PORT);
}

function startLoginProcess(scopes, accesscallback) {
	var url = getLoginURL(scopes);
	var open = spawn('open', [url]);
	startLoginServer(function(code) {
		// console.log('got auth code', code);
		getAccessToken(code, function(accessToken, refreshToken) {
			// console.log('got access token', accessToken);
			// console.log('got refresh token', refreshToken);
			setLastAccessToken(accessToken);
			setLastRerfreshToken(refreshToken);
			accesscallback(accessToken);
		});
	});
}

function authCommand(args) {
	if (args.length == 0) {
		args = DEFAULT_SCOPES;
	}

	startLoginProcess(args, function(access_token) {
		console.log('Authenticated.');
		console.log();
		console.log('Access token:');
		console.log('\t' + access_token);
		console.log();
		console.log('Try it:');
		console.log('\tcurl -H \'Authorization: Bearer ' + access_token + '\' https://api.spotify.com/v1/me');
		console.log();
		console.log('Or:');
		console.log('\tspapi curl https://api.spotify.com/v1/me');
		console.log();
		process.exit();
	});
}

function refreshCommand() {
	var refresh_token = getLastRefreshToken();
	if (!refresh_token) {
		console.log('No refresh token.');
	} else {
		refreshAccessToken(refresh_token, function(access_token) {
			setLastAccessToken(access_token);
			console.log('Got a new access token.');
			console.log();
			console.log('Access token:');
			console.log('\t' + access_token);
			console.log();
			console.log('Try it:');
			console.log('\tcurl -H \'Authorization: Bearer ' + access_token + '\' https://api.spotify.com/v1/me');
			console.log();
			console.log('Or:');
			console.log('\tspapi curl https://api.spotify.com/v1/me');
			console.log();
		});
	}
}

function translateRelativeApiCall(lastarg) {
	// /v123/something -> host/v123/something
	if (lastarg.match(/^\/v[0-9\.]+\//g)) {
		lastarg = DEFAULT_ROOT + lastarg;
		return lastarg;
	}

	// /something -> host/v?/something
	if (lastarg.match(/^\/.*/g)) {
		lastarg = DEFAULT_ROOT + DEFAULT_VERSION_PREFIX + lastarg;
		return lastarg;
	}

	return lastarg;
}

function curlCommand(args) {
	var access_token = getLastAccessToken();
	var newargs = ['-H', 'Authorization: Bearer ' + access_token, '-ss'];
	newargs = newargs.concat(args);

	var lastarg = newargs[newargs.length - 1];
	var transformed = translateRelativeApiCall(lastarg);
	newargs[newargs.length - 1] = transformed;

	var curl = child_process.spawn('curl', newargs, function (error, stdout, stderr) {
	    console.log('stdout: ' + stdout);
	    console.log('stderr: ' + stderr);
	    if (error !== null) {
	      console.log('exec error: ' + error);
	    }
	});

	curl.stdout.on('data', function (data) {
		process.stdout.write('' + data);
	});

	curl.stderr.on('data', function (data) {
		process.stdout.write('' + data);
	});

	curl.on('close', function (code) {
	});
}

if (process.argv.length < 3) {
	syntax();
} else {
	var cmd = process.argv[2];
	if (cmd == 'auth' || cmd == 'authorize') {
		authCommand(process.argv.splice(3));
	} else if (cmd == 'refresh') {
		refreshCommand();
	} else if (cmd == 'curl') {
		curlCommand(process.argv.splice(3));
	} else {
		syntax();
	}
}
