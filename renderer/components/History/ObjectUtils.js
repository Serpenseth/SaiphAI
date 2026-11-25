const ObjectUtils = {
  areSame(obj1, obj2) {
    if (obj1.user.length !== obj2.user.length)
      return false;

    for (let i = 0; i < obj1.user.length; i++) {
      if (obj1.user[i] !== obj2.user[i])
        return false;
    }

    return true;
  },

  alreadyExists(tabID, allObjs) {
    for (let i = 0; i < allObjs.length; i++) {
      if (tabID === allObjs[i][0]) {
        return true;
      }
    }
    return false;
  },
}

export { ObjectUtils };
