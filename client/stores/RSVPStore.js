const _ = require('lodash');
const Store = require('store-prototype');
const request = require('superagent');

const RSVPStore = new Store();

const loaded = false;
const busy = false;
const meetup = {};
const rsvp = {};
const attendees = [];

const REFRESH_INTERVAL = 60000; // one minute

const refreshTimeout = null;

function cancelRefresh() {
	clearTimeout(refreshTimeout);
}

RSVPStore.extend({

	getMeetup: function() {
		return meetup;
	},

	getRSVP: function() {
		return rsvp;
	},

	getAttendees: function(callback) {
		return attendees;
	},

	rsvp: function(attending, callback) {
		if (busy) return;
		cancelRefresh();
		busy = true;
		RSVPStore.notifyChange();
		request
			.post('/api/me/meetup')
			.send({ data: {
				meetup: NYCNode.currentMeetupId,
				attending: attending
			}})
			.end(function(err, res) {
				if (err) {
					console.log('Error with the AJAX request: ', err)
					return;
				}
				RSVPStore.getMeetupData();
			});
	},

	isLoaded: function() {
		return loaded;
	},

	isBusy: function() {
		return busy;
	},

	getMeetupData: function(callback) {
		// ensure any scheduled refresh is stopped,
		// in case this was called directly
		cancelRefresh();
		// request the update from the API
		busy = true;
		request
			.get('/api/meetup/' + NYCNode.currentMeetupId)
			.end(function(err, res) {
				if (err) {
					console.log('Error with the AJAX request: ', err)
				}
				busy = false;
				if (!err && res.body) {
					loaded = true;
					meetup = res.body.meetup;
					rsvp = res.body.rsvp;
					attendees = res.body.attendees;
					RSVPStore.notifyChange();
				}
				RSVPStore.queueMeetupRefresh();
				return callback && callback(err, res.body);
			});
	},

	queueMeetupRefresh: function() {
		refreshTimeout = setTimeout(RSVPStore.getMeetupData, REFRESH_INTERVAL);
	}

});

RSVPStore.getMeetupData();
module.exports = RSVPStore;
