var express = require('express');
var bodyParser = require('body-parser');
var url = require('./mydata.js');
var mongo = require('mongodb').MongoClient;
var mu = require('mongo-escape').unescape;
var me = require('mongo-escape').escape;

var router = express.Router();

//THINGS TO CONSIDER
//Add a counter that counts login attempts and blacklists repeat offenders


router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.post('/', format, performSearch, delegateResponse, errorHandler);


function format(req, res, next){
	res.locals.searchTokens = req.query.q.split('+');
	res.locals.searchString = res.locals.searchTokens.join(' ');
	if(req.query.lim && req.query.lim <= 100){
		res.locals.lim = req.query.lim;
	} else
		res.locals.lim = 100;
	res.locals.searchResult = null;

	next();
}

function performSearch(req, res, next){
	mongo.connect(url)
		.then(function(db) {
			db.collection('bookList').find({
				"$test": {
					$search: res.locals.searchString
				}
			}).limit(res.locals.lim)
			.then(function(result) {
				console.log(result);
				res.localcs.searchResult = result;
			})
		})

}