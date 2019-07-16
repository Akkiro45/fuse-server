const mongoose = require('mongoose');

const { expirationTime } = require('../utility/expiration-time');

const SessionSchema = new mongoose.Schema({
  data: {
    type: String
  },
  expire_at: {
    type: Date,
    default: Date.now,
    expires: expirationTime/1000 // in seconds
  }
});

SessionSchema.statics.saveSession = function(data) {
  const Session = this;
  const stringData = JSON.stringify(data);
  const session = new Session({ data: stringData });
  return session.save()
}

SessionSchema.statics.updateSession = function(sessionID, data, flag, prop) {
  const Session = this;
  let body;
  return Session.findById(sessionID)
    .lean()
    .select({ data: 1 })
    .then(s => {
      body = JSON.parse(s.data);
      if(flag) {
        body.shop[prop] = data;
      } else {
        body.shop = data;
      }
      const stringData = JSON.stringify(body);
      return Session.update({ _id: sessionID }, {
        $set: {
          data: stringData
        }
      });
    })
}

SessionSchema.statics.updateUserSession = function(sessionID, data, prop) {
  const Session = this;
  let body;
  return Session.findById(sessionID)
    .lean()
    .select({ data: 1 })
    .then(s => {
      body = JSON.parse(s.data);
      body[prop] = data;
      const stringData = JSON.stringify(body);
      return Session.update({ _id: sessionID }, {
        $set: {
          data: stringData
        }
      });
    })
}

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;
