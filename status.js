/* express app as a webtask */


/*
 * wt create -s SECRET=<SHARED_SECRET> status.js
 */
var Express = require('express');
var Webtask = require('webtask-tools');
var logger = require('morgan');

var app = Express();

app.use(logger('dev'));

// body parser seemed to be causing issues?

// POST -- for posting our statuses
app.post('/status', function (req, res) {
  console.log("post to /status");
  var ctx = req.webtaskContext;
  var site = ctx.body.site;
  var stat = ctx.body.status;

  // if you want to force a data overload condition
  // For testing LARGE contents
  if(ctx.body.overload){
    for(var i = 0 ; i < 500000 ; i++){
      stat = stat+"1";  
    }
  }
  
  // Checking for shared secret and validity
  if((!req.headers || !req.headers.secret) || site == null || stat == null){
    return res.status(400).send("Improperly formed request");
  }
  if(req.headers.secret != ctx.data.SECRET){
    return res.status(400).send("Invalid secret, cannot save");
  }

  // We know we have enough info, lets get persisted data
  ctx.storage.get(function (err, data) {
    if (err){
      console.log("error:",err);
      return res.status(500).send("Error getting context");  
    }

    // Basic data checking to make sure we can store
    if (!data) data = { };
    if (!data[site]){
      data[site] = [stat];
    } else {
      data[site].unshift(stat);
      if(data[site].length > 60){
        data[site] = data[site].slice(0,60);
      }
    }

    // Dump what we have to logs
    console.log("data:",data);

    // lets try to best effort save it
    var attempts = 3;
    // not atomic, so could potentially overwrite data if we had multiple sites?
    ctx.storage.set(data, function set_cb(err) {
      if (err){
        console.log(err);
        if (error.code === 409 && attempts--) {
          console.log("conflict, retrying save");
          // resolve conflict and re-attempt set
          return ctx.storage.set(data[site], set_cb);
        }
        if(err.code === 413){
          // simple attempt to auto fix because we are rrd'ing...eventually we would run out of space with enough sites (X * 60 statues * size of each status) up to 500kb
          console.log("too much data, popping some data");
          data[site].shift();
          ctx.storage.set(data, function(err){
            if(err){
              console.log("maybe its time to reset or get a bigger boat?");
              return res.status(500).send("Error setting context even after clearing");
            }
            console.log("data successfully stored");
            return res.json(data);
          });
        } else {
          return res.status(500).send("Error setting context");
        }
      } else {
        // data stored without hassle
        console.log("data successfully stored");
        return res.json(data);
      }
    });
  });
});

// DELETE
app.delete("/status",function(req,res){
  var ctx = req.webtaskContext;
  // check out shared secret
  if(!req.headers || !req.headers.secret){
    return res.status(400).send("Secret header required");
  }
  if(req.headers.secret != ctx.data.SECRET){
    return res.status(400).send("Invalid secret, cannot save");
  }
  // reset all the things...could just reset sites etc, but this is just a demo
  ctx.storage.set({}, {force: 1}, function (err) {
    if (err){
      console.log(err);
      res.status(500).send("Error setting context");
    }
    console.log("data successfully stored");
    res.json({});
  });
})

// GET
app.get('/status', function (req, res) {
  var ctx = req.webtaskContext;
  // get all the things
  ctx.storage.get(function (err, data) {
    if (err){
      res.status(500).send("Error getting context"); 
    }
    if (!data) data = { };
    console.log("data:",data);
    res.json(data);
  });
});

// lets do a simple server side template to display to browser
app.get('/status.html',function(req,res){
  var ctx = req.webtaskContext;
  ctx.storage.get(function (err, data) {
    if (err){
      res.status(500).send("Error getting context"); 
    }
    if (!data) data = { };
    console.log("data:",data);
    // build some ugly html...could probably d3 or OTHER this to make it 'pretty'...see previous demo comment
    var html = "<html><body>";
    for(var site in data){
      html += "<h1>" + site + "</h1>";
      html += "<table>";
      html += "<tr><th>time ago(minutes)</th><th>status</th></tr>";
      for(var status in data[site]){
        html += "<tr><td>" + status + "</td><td bgcolor='" + (data[site][status] == 'success' ? "green" :"red") +"'>" + data[site][status] + "</td></tr>";
      }
      html += "</table>";
    }
    html += "</body></html>";
    res.send(html);
  });
});

// expose this express app as a webtask-compatible function

module.exports = Webtask.fromExpress(app);
