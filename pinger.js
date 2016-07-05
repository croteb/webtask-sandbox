var request = require('request');

// wt cron schedule -s SITE_ENDPOINTS=<csv of endpoints to choose randomly> -s SITEBASE <site to report on, label> -s SECRET=<shared secret> -s RESULT_URL=<where are we posting data to?> "*/1 * * * *" pinger.js
module.exports = function(ctx,cb) {
  // A simple test API that can return 2xx and 4xx on demand depending on path
  var site_base = ctx.data.SITEBASE;
  var sites = ctx.data.SITE_ENDPOINTS.split(",");
  // Where are we sedning the data?
  var result_url = ctx.data.RESULT_URL;
  var test_site = sites[Math.floor(Math.random()*sites.length)];
  // lets get the status of something and update our other task
  request(test_site, function (error, response, body) {
    // set our OTHER webtask accordingly
    if (!error && response.statusCode == 200) {
      console.log("success ping");
      request.post({url: result_url, headers: {secret: ctx.data.SECRET}, json: {site: site_base, status: "success"} }, function(error,response,body){
        console.log("set remote site",error,response.statusCode);
        return cb(null,body);
      })
    } else {
      console.log("error ping");
      request.post({url: result_url, headers: {secret: ctx.data.SECRET}, json: {site: site_base, status: "failure"} }, function(error,response,body){
        console.log("set remote site",error,response.statusCode);
        return cb(null,body);
      });
    }
  })
}
