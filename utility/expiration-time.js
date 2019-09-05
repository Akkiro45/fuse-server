const expirationTime = 86400000; // In mile seconds // 1 day
// const expirationTime = 1000 * 60 * 2;
const expirationTimeForFreshToken = 864000000; // 10 days
// const expirationTimeForFreshToken = 1000 * 60 * 5;

module.exports = {
  expirationTime,
  expirationTimeForFreshToken
}
