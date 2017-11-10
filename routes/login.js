var express = require('express');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
var url = require('./mydata.js');
var mongo = require('mongodb').MongoClient;
var mu = require('mongo-escape').unescape;
var me = require('mongo-escape').escape;
var mdbai = require('mongodb-autoincrement');

var router = express.Router();

//THINGS TO CONSIDER
//Add a counter that counts login attempts and blacklists repeat offenders


router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.post('/', format, verifyCredentials, setLiveID, errorHandler);

function format(req, res, next) {
	res.locals.username = req.body.username;
	res.locals.password = req.body.password;
	res.locals.hash = null;
	res.locals.expiry = null;
	res.locals.liveID = null;

	next();
}

function verifyCredentials(req, res, next) {
	var pattern = new RegExp("^[a-zA-Z0-9]{7,17}$");
	var passes = pattern.test(res.locals.username) && res.locals.username.length < 17;

	console.log('Valid username: ' + passes + '\n');

	if(!passes)
		next('invalid username');

	function retrievePassword(usr){
		return mongo.connect(url)
			.then(function(db) {
				var x = db.collection("loginList").find({username: me(usr)}).toArray()
				.then(function(result) {
					console.log('Result: ');
					console.log(result);
					console.log('\n');
					console.log('Result[0].password: \n');
					console.log(result[0].password);
					console.log('\n');
					if(result.length == 0)
						return null;
					if(result[0].expiry)
						res.locals.expiry = result[0].expiry;
					if(result[0].liveID)
						res.locals.liveID = result[0].liveID;

					return mu(result[0].password);
				});
				console.log(x);
				console.log('\n');
				return db.collection("loginList").find({username: me(usr)}).toArray()
				.then(function(result) {
					console.log('Result: ');
					console.log(result);
					console.log('\n');
					console.log('Result[0].password: \n');
					console.log(result[0].password);
					console.log('\n');
					if(result.length == 0)
						return null;
					if(result[0].expiry)
						res.locals.expiry = result[0].expiry;
					if(result[0].liveID)
						res.locals.liveID = result[0].liveID;

					return mu(result[0].password);
				});
			})
	}

	retrievePassword(res.locals.username)
		.then(function(pwd) {
			console.log('Password: ');
			console.log(pwd);
			console.log('\n');
			if(pwd == null)
				next('invalid username');
			else
				res.locals.hash = pwd;
			console.log('REACH\n\n\n\n');
			bcrypt.compare(res.locals.password, res.locals.hash)
				.then(function(res) {
					console.log('REACHHHH\n\n\n\n\n\n');
					if(res){
						next();
					} else
						next("incorrect password");
				})
		})
		.catch(function(error) {
			console.log(error);
			console.log('\n');
		});
}

function setLiveID(req, res, next){
	//check if live ID active lmao
	mongo.connect(url)
		.then(function(db) {
			if(Date().valueOf() < res.locals.expiry)
				return;
			mdbai.getNextSequence(db, 'loginList')
				.then(function(seq) {
					res.locals.liveID = seq;
					var loginToken = {liveID: seq, expiry: Date(3600000).valueOf()};
					db.collection('loginList').update({username: res.locals.username}, loginToken);
				})
		}).then(function() {
			res.send('liveID=' + res.locals.liveID + '\n');
			next();
		})

}

function errorHandler(err, req, res, next){
	switch(err){
		case 'invalid username':
			res.send('invalid username\n');
			break;
		case 'incorrect password':
			res.send('incorrect password\n');
			break;
	}
}

module.exports = router;


