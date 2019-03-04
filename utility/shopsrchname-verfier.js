const checkwhiteSpaces = (str) => {
  for(let i=0; i<str.length; i++) {
    if(str[i] !== ' ') {
      return false;
    }
  }
  return true;
}

const shopsrchnameVerfier = (shopSrchName) => {
  if(checkwhiteSpaces(shopSrchName)) {
    return false;
  }
  if(shopSrchName.length > 120) {
    return false;
  }
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
    if(shopSrchName === list[i]) {
      return false;
    }
  }
  const re = /[~`\s!#$%\^&*@/+=\[\]\\';,/{}|\\":<>\?]/;
  if(re.test(shopSrchName)) {
    return false;
  }
  return true;
}

module.exports = {
  shopsrchnameVerfier
}
