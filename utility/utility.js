const _ = require('lodash');

const pickData = (user) => {
  // const resBody = _.pick(user, ['firstName', 'lastName', 'phoneNumber', 'email']);
  // return { resBody };
  return _.pick(user, ['firstName', 'lastName', 'phoneNumber', 'email']);
}

const pickShopData = (s) => {
  return _.pick(s, ['shopName', '_id', 'isStatic']);
}

const generateResBody = (status, body) => {
  if(status === 'ok')
    return { status: 'ok', data: body };
  else
    return { status: 'error', error: body };
}

module.exports = {
  pickData,
  pickShopData,
  generateResBody
}
