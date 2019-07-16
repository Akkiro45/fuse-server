module.exports = (token, type) => {
  return 'https://' + (type === 'customer' ? 'shop.thefuse.in' : 'thefuse.in') + '/reset/password/?token=' + token;
}
