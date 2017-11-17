var express = require('express');
var bodyParser = require('body-parser');
var url = require('./mydata.js');
var mongo = require('mongodb').MongoClient;
var mu = require('mongo-escape').unescape;
var me = require('mongo-escape').escape;

var router = express.Router();

//THINGS TO CONSIDER
//Add a counter that counts login attempts and blacklists repeat offenders

//add db.close()...


router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.get('/', format, performSearch, delegateResponse, errorHandler);


function format(req, res, next){
	res.locals.searchTokens = req.query.q.split('+');
	res.locals.searchString = res.locals.searchTokens.join(' ');
	if(req.query.lim && req.query.lim <= 100){
		res.locals.lim = req.query.lim;
	} else
		res.locals.lim = 100;
	res.locals.searchResult = null;
	//install responses
	res.locals.r = req.query.r;

	next();
}

function performSearch(req, res, next){
	mongo.connect(url)
		.then(function(db) {
			db.collection('bookList').find({
				"$text": {
					"$search": me(res.locals.searchString),
					"$caseSensitive": false
				}
			}).limit(res.locals.lim).toArray()
			.then(function(result) {
				console.log('Result: ');
				console.log(result);
				console.log('\n');
				res.locals.searchResult = result;
				next();
			});
		})
		.catch(function(error) {
			console.log('Error: ');
			console.log(error);
			console.log('\n');
		});

}

function delegateResponse(req, res, next){
	res.send(JSON.stringify(res.locals.searchResult) + '\n');
}

function errorHandler(err, req, res, next){

}

module.exports = router;