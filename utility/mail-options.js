const getMailOptions = (token, email, type) => {
  const link = require('./reset-pass-link')(token, type);
  return {
    from: 'contactfuse18@gmail.com',
    to: email,
    subject: 'Reset Password for Fuse Account',
    html: 'Click on below link to reset your password! <br></br> <a href="' + link + '">' + link + '</a><br></br> This link is valid for only 24hours and make sure no other person get this link because anyone with this link will be able to change your password.'
  }
}

module.exports = getMailOptions;
