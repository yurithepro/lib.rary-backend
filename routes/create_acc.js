var express = require('express');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');
var url = require('./mydata.js');
var mongo = require('mongodb').MongoClient;
var me = require('mongo-escape').escape;

var router = express.Router();

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.post('/', format, checkUsername, checkPassword, checkEmail, checkNumber, apply, errorHandler);

function format(req, res, next){

	res.locals.username = req.body.username;
	res.locals.password = req.body.password;
	res.locals.email = req.body.email;
	res.locals.number = req.body.number;

	next();
}

function checkUsername(req, res, next){
//is username between 8 and 16 chars?
//does username only use a-z, A-Z, 0-9?
	var pattern = new RegExp("^[a-zA-Z0-9]{7,17}$");
	var passes = pattern.test(res.locals.username) && res.locals.username.length < 17;

	console.log('Valid username: ' + passes + '\n');

	if(!passes)
		next('invalid username');


	function usernameExists(str){
		return mongo.connect(url)
		.then(function(db) {
			return db.collection("loginList").find({username: me(str)}).toArray()
			.then(function(docs) {
				console.log('Search query result: ');
				console.log(docs);
				console.log('\n');
				db.close();
				if(docs.length == 0){
					return false;
				} else
					return true;
			});
		});
	}
	usernameExists(res.locals.username).then(function(result) {
		console.log('Username Exists in DB: ' + result + '\n');

		if(result)
			next('username already taken');
		else 
			next();
	});
}
function checkPassword(req, res, next){
//is password between 8 and 16 chars?
//does password only use a-z, A-Z, 0-9?
	var pattern = new RegExp("^[a-zA-Z0-9]{7,17}$");
	var passes = pattern.test(res.locals.password) && res.locals.password.length < 17;

	console.log('Valid password: ' + passes + '\n');

	if(passes){
		next();
	} else
		next('invalid password');
}
function checkEmail(req, res, next){
//less than 50 chars?
//does email contain @?
//how about a . after that?
//rest of char alphanumeric
	var pattern = new RegExp("^[a-zA-Z0-9]+@{1}[a-zA-Z0-9]+(\.{1}[a-z]*)*$");
	var passes = pattern.test(res.locals.email) && res.locals.email.length < 50;
	console.log('Valid email: ' + passes + '\n');
	if(passes){
		next();
	} else
		next('invalid email');
}
function checkNumber(req, res, next){
//is present?
//only US numbers so
//nine char length?
//digits only?
	var pattern = new RegExp("^[0-9]{10}$");
	var passes = pattern.test(res.locals.number) && res.locals.number.length == 10;
	console.log('Valid number: ' + passes + '\n');
	if(passes){
		next();
	} else
		next('invalid phone number');
}
function apply(req, res, next){
//check if username in use
//////////////////////////
//////////////////////////
//////////////////////////
//////////////////////////
//use bcrypt + salt on password
//update in database 
	function store(err, hash){
	//MongoDB update
		if(err) throw err;
		var newUser = {username: me(res.locals.username), password: me(hash), _id: null};
		mongo.connect(url, function(err, db) {
			if(err) throw err;
			db.collection("loginData").insert({email: me(res.locals.email), number: me(res.locals.number)}, {w: 1})
			.then(function(resp) {
				res.locals.id = resp.ops[0]._id;
				console.log('User Data insert returned: ');
				console.log(resp);
				console.log('\n');
			}).then(function(resp) {
				newUser._id =  res.locals.id;
				db.collection("loginList").insert(newUser, {w:1}, function(err, resp) {
					if(err) throw err;
					console.log(resp + '\n');
					console.log('Successfully stored: true\n');
					db.close();
				});
			})
		});
	}	
	var saltrounds = 10;
	try{
		bcrypt.hash(res.locals.password, saltrounds, store);
	} catch(err){
		next('database failure');
	}
	console.log('New Account Successfully Created\n');
	res.send('New account successfully created\n');
}

function errorHandler(err, req, res, next){
//error with username?
//error with password?
//error with email?
//error with phone number?
//error with placing in database?

	switch(err){
		case 'invalid username':
			res.send('Error with username\n');
			break;
		case 'username already taken':
			res.send('Error with username: already taken\n');
			break;
		case 'invalid password':
			res.send('Error with password\n');
			break;
		case 'invalid phone number':
			res.send('Error with phone number\n');
			break;
		case 'invalid email':
			res.send('Error with email\n');
			break;
		case 'database failure':
			res.send('Error with database\n');
			break;

	}

}

module.exports = router;

