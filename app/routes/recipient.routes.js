// School routes - /api/school/...
var express = require('express');
var router = express.Router();
var keys = require.main.require('./app/config/keys');
var Recipient = require.main.require('./app/models/recipient');
var Message = require.main.require('./app/models/message');
var Fact = require.main.require('./app/models/fact');
var Upvote = require.main.require('./app/models/upvote');
var FactService = require.main.require('./app/services/fact.service');
var IFTTTService = require.main.require('./app/services/ifttt.service.js');
var strings = require.main.require('./app/config/strings.js');

router.get('/', function(req, res) {
	if (req.query && req.query.code == keys.dbPassword) {
		FactService.getFact(function(fact) {
			var recipients, io = req.app.get('socketio');
			
			Recipient.find().then(function(dbRecipients) {
				recipients = dbRecipients;
				var messages = recipients.map(function(o) { return new Message({text: fact, number: o.number, type: 'outgoing'}) });
				for (var i = 0; i < messages.length; i++) {
					io.emit('message', {message: messages[i].text, recipient: dbRecipients[i]});
				}
				return Message.create(messages);
			})
			.then(function() {
				return Upvote.aggregate([
					{$group: {_id: '$fact', upvotes: {$sum: 1}}},
					{$sort: {upvotes: -1}},
					{$limit: 1}
				]);
			})
			.then(function(customFacts) {
				if (customFacts.length == 0 || fact.upvotes <= 0) {
					return res.status(200).json({
						fact: fact,
						recipients: recipients
					});
				} else {
					fact = customFacts[0];
					return Fact.update({_id: fact._id}, {used: true});
				}
			})
			.then(function() {
				return Fact.populate(fact, {path: '_id'});
			})
			.then(function() {
				return res.status(200).json({
					fact: fact._id.text,
					recipients: recipients
				});
			}, function(err) {
				console.log(err);
				return res.status(400).json(err);
			});
		});
	} else {
		return res.status(400).json({message: "Provide the code to recieve recipients"});
	}
});

router.get('/me', function(req, res) {
	if (req.user) {
		Recipient.find({addedBy: req.user._id}).sort('name').then(function(recipients) {
			return res.status(200).json(recipients);
		}, function(err) {
			return res.status(400).json(err);
		});
	} else {
		return res.status(401).json({message: strings.unauthenticated});
	}
});

router.post('/', function(req, res) {
	if (req.user) {
		var io = req.app.get('socketio');
		
		var newRecipient = new Recipient({
			name: req.body.name,
			number: req.body.number.replace(/\D/g,'').replace(/^1+/, ''),
			addedBy: req.user._id
		});
		
		var welcomeMessage = new Message({
			text: strings.welcomeMessage,
			number: req.body.number,
			type: 'outgoing'
		});
		
		Promise.all([
			newRecipient.save(),
			welcomeMessage.save()
		])
		.then(function(results) {
			io.emit('message', {message: results[1].text, recipient: results[0]});
			IFTTTService.sendSingleMessage({number: results[0].number, message: strings.welcomeMessage});
			
			return res.status(200).json(results[0]);
		}, function(err) {
			return res.status(400).json(err);
		});
	} else {
		return res.status(401).json({message: strings.unauthenticated});
	}
});

module.exports = router;