# fortnite-stats-google-spreadsheet
A self deploying google apps script with self-deploying charts, automatic data collection, discord integration, email integration, error handling and UI alerts.  Displays ongoing statistics for an arbitrary number of Fortnite accounts.

To set up the script it's very simple, add as many usernames to the fortniteUsernames list as you want, get an api key by messaging !getapikey to @Fortnite Stats on discord, see details in the script, furthermore you can add as many discord webhooks as you want, these will be messaged when the status of the servers change. Optionally you can have your published chart be sent to you as a report weekly, or use the deprecated function if you want to be sent images, but it's not very useful anymore.

Afterwars you only need to set up a time-driven trigger for main, I recommend 5 minutes as the interval, you can set up a trigger by going to 
Edit-> Current project's triggers.

Optionally you can add sendChartsToEmails() and sendChartToDiscord() as triggers if you want to be sent charts on your email and your published chart on your discord webhook.

You can also run the main function the first time yourself if you want to see how charts are create and such, it's pretty cool.

**27-apr-18**
- Added extra functionality, UI for alerts and error handling.
- Updated readme
