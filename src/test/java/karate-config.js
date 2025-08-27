function fn() {
    var config = {};
    config.comOccHostname = 'http://localhost:3000';
    config.comOccPath = 'dv';
    var cp = java.lang.System.getProperty('java.class.path');
    karate.log('Classpath:', cp);
    karate.log('[print]', 'Hostname:', config.comOccHostname);
    var result = karate.callSingle('classpath:features/separateApi/auth.feature@Auth');
    config.authToken = result.token;
    config.commonHeader = {
        Accept: 'application/json',
        Authorization: 'Bearer ' + config.authToken
      };
    config.commonParams = { cps: true};
    return config;
  }
  