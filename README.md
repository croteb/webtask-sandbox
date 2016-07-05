# Simple Webtask Demo
This is a simple example of two webtasks that work together. It is a poor man's RRD dashboard of a website status (last 60 minutes of statuses in this case).

The first one is essentially a cron job that checks the status of a site.  This could be expanded to check multiple sites, but currently it hits a simple backend that will succeed/fail depending on endpoint hit.  It determines this randomly on each run.

The second is a collector endpoint.  It reports on the collection of results in html and json formats depending on endpoint hit.  Writes and deletes are protected by a shared secret.

# To deploy:
1. wt cron schedule -s SITE_ENDPOINTS=<csv of endpoints to choose randomly> -s SITEBASE <site to report on, label> -s SECRET=<shared secret> -s RESULT_URL=<where are we posting data to?> "*/1 * * * *" pinger.js
 * This will deploy the cron task to ping a site
2. wt create -s SECRET=<SHARED_SECRET> status.js
 * This will deploy the status 'app'
3. Go to <status task url>/status.html OR <status task url>/status
 * This will display a simple html webpage of the last 60 minutes of results using server-side rendering OR the json representation of it

# Author
Beau Croteau

# License
This project is licensed under the MIT license. See the LICENSE file for more info.
