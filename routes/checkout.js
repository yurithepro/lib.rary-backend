var express = require('express');
var bodyParser = require('body-parser');
var url = require('./mydata.js');
var mongo = require('mongodb').MongoClient;
var mu = require('mongo-escape').unescape;
var me = require('mongo-escape').escape;

var router = express.Router();

//THINGS TO CONSIDER
//Add a counter that counts login attempts and blacklists repeat offenders

//You ofcourse could create a local object for the database connection...
//This would save LOADS of time but come back to this later

//add error codes to error responses in each module

//add check for parameters in each module

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.post('/', format, checkUserStatus, checkBookStatus, setRequest, requestCode, errorHandler);

function format(req, res, next) {
	res.locals.liveID = parseInt(req.body.liveID);
	res.locals.bookID = parseInt(req.query.isbn);
	res.locals.userID = null;

	next();
}

function checkUserStatus(req, res, next) {
	//check if active liveID
	//check if user has any overdue books
	//check if user has slot open for takeout
	//check if book already checked out/requested by user
	//check that user isn't requesting more than three books

	function verifyLiveID(db) {
		return db.collection('loginList').findOne({liveID: res.locals.liveID})
			.then(function(result) {
				
				if(!result){
					throw "invalid session";
				}
				else {
					if(result.expiry < Date.now())
						throw "outdated session";
					else{
						res.locals.userID = result._id;
					}
					
				}

				return db;
			});

	} 

	function verifyCheckedOutStatus(db) {
		console.log('verifyCheckedOutStatus\n');
		return db.collection('checkOutList').findOne({_id: res.locals.userID})
			.then(function(result) {
				if(!result)
					return db;
				if(result.slots == 0)
					throw "no slots available";

				var date = Date().valueOf();
				for(var entry in result.books) {
					if(entry.expiry < date)
						throw "overdue books";
					if(entry.bookID == res.locals.bookID)
						throw "user already checked book out";
				}
				return db;
			});
	}

	function verifyRequestStatus(db) {
		console.log('verifyRequestStatus\n');
		db.collection('requestCheckOutList').findOne({_id: res.locals.userID})
			.then(function(result) {
				if(!result | !result.books)
					return;

				if(result.books.length > 2)
					throw "no request slots";
				for(var entry in result.books) {
					if(entry.bookID == res.locals.bookID)
						throw "user already requesting book";
					}
			});
	}

	function catchError(err){
		next(err);
	}


	mongo.connect(url)
		.then(verifyLiveID)
		.then(verifyCheckedOutStatus)
		.then(verifyRequestStatus)
		.then(function() {
			next();
	}).catch(catchError);	
}

function checkBookStatus(req, res, next){	
	//check if library has book
	console.log('checkBookStatus\n');

	mongo.connect(url)
		.then(function(db) {
			return db.collection('bookData').findOne({_id: res.locals.bookID})
				.then(function(result) {
					if(result.available == 0)
						next('book not available');
					else 
						next();
				});
		});
}
function setRequest(req, res, next){
	//udpate in requestCheckOutList

	console.log('setRequest\n');
	var reqObj = {bookID: res.locals.bookID, stamp: Date().valueOf()};


	mongo.connect(url)
		.then(function(db) {
			console.log('We Hear\n');
			return db.collection('requestCheckOutList').update({_id: res.locals.userID}
				, {"$push": {books: reqObj}}
				, {w: 1, upsert: true}
			);
		}).then(function(result) {
			console.log('Result: ');
			console.log(result);
			console.log('\n');
			next();
		}).catch(function(err) {
			console.log(err);
			console.log('\n');
		});
		
}
function requestCode(req, res, next){
	//respond with the id for request
	//userID:bookID
	res.send(res.locals.userID + ':' + res.locals.bookID + '\n');


}
function errorHandler(err, req, res, next){
	switch(err) {
		case 'invalid session':
			res.send('invalid session\n');
			break;
		case 'no available slots':
			res.send('no available slots\n');
			break;
		case 'overdue book(s)':
			res.send('overdue book(s)\n');
			break;
		case 'user already checked book out':
			res.send('user already checked book out\n');
			break;
		case 'already requesting book':
			res.send('already requesting book\n');
			break;
		case 'book not available':
			res.send('book not available\n');
			break;
		case 'book not provided':
			res.send('book not provided');
			break;
	}
}

module.exports = router;