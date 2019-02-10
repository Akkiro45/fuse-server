const _ = require('lodash');

const pickData = (user) => {
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

const checkDomainName = (domain) => {
  const list = [
    'auth',
    'auth/logout',
    'auth/tandc/privacy-policy',
    'auth/tandc',
    'shop',
    'shop/inventory',
    'shop/profile',
    'shop/orders',
    'shop/create'
  ]
  for(let i=0; i<list.length; i++) {
    if(domain === list[i]) {
      return false;
    }
  }
  return true;
}

module.exports = {
  pickData,
  pickShopData,
  generateResBody,
  checkDomainName
}
