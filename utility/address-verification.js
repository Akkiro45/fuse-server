const addressVerification = (address) => {
  address.latitude = -1;
  address.longitude = -1;
  address.valid = true;
  return address;
}

module.exports = {
  addressVerification
};
