function fn() {
    var config = {
      comOccHostname: 'http://localhost:3000',
      comOccPath: 'dv'
    };
    karate.log('[print]', 'Hostname:', config.comOccHostname);
   // var result = karate.callSingle('classpath:separateApi/auth.feature@Auth');
    config.authToken = "abcdadf";
    config.commonHeader = {
        Accept: 'application/json',
        Authorization: 'Bearer ' + 'abddsds'
      };
    config.commonParams = { cps: true};
    return config;
  }
  
