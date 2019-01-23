'use strict';

const https = require('https');

module.exports.hello = function(event, context) {
  var url = "https://ifconfig.me";
  https.get(url, (resp) => {
    let data = '';

    // Continuously update stream with data
    resp.on('data', (chunk) => {
      // A chunk of data has been recieved.
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      context.succeed(data);
    });

  }).on("error", (err) => {
    context.fail("Error: " + err.message);
  });
};
