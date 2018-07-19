// This spreadsheet can be used to visualize your forntite statistics, as you play games the data will be automatically updated. 
// Note, optionally you can add sendChartsToEmails() and sendChartToDiscord() as weekly triggers to recieve reports
// for that you will need to make a webhook from discord, and publish your chart and include it here, it is optional functionality however. 

// REQUIRED CONFIGURATION
// Add any number of usernames to the "fortniteUsernames" array and add main() as a time-driven trigger (5 minutes would be a good interval).
var fortniteUsernames = ['your fortnite username', 'another fornite username'];
// Get an api key by direct messaging @Fortnite Stats on discord, with the message !getapikey  visit https://fortnite.y3n.co/ for more details
var key = 'your api key';
// Everything else will be set up automatically.

// OPTIONAL CONFIGURATION
// if the servers status changes emails will be sent to these addresses, you can add as many as you want
var emailAddresses = ['some email', 'another email'];
// Discord webhook urls, a list of discord webhooks / routes, when server status changes, messages will be sent to these webhooks
var discordWebhookUrls = ['your discord webhook'];
// optionally you can publish your charts so it can be sent to you on discord as a weekly report for example, add sendChartToDiscord() as a trigger
var chartsLink = 'your published charts link';

// visual configuration
var titleBackgroundColor = '#e56030';
var titleFontColor = 'white';
var titleFontSize = 14;
var serverStatusBackgroundColor = '#e56030';
var serverStatusFontColor = 'white';
var serverStatusFontSize = 14;
var serverMessageBackgroundColor = '#e56030';
var serverMessageFontColor = 'white';
var serverMessageFontSize = 14;


// constants
var entryColumn = 'A';
var soloMatchesColumn = 'B';
var duoMatchesColumn = 'G';
var modes = ['solo', 'duo'];
var titleRange = 'A1:C1';
var serverStatusRange = 'D1:E1';
var serverMessageRange = 'F1:H1';
var serverStatusDataCell = 'A1';
var chartsCreatedDataCell = 'A2';

function main(){
  //setupUI(); // not working called by trigger for some reason.
  initializeSpreadsheet();
  var gameStatus = getGamestatusJson(); // API call
  updateServerMessages(gameStatus); // server status and server message displays
  initializeVariables(gameStatus);
  
  // send emails to a list of emails with the status of the fortnite servers 
  var emailSubject = 'Fortnite servers: ' + gameStatus.status;
  var emailBody = 'Fortnite servers and are now ' + gameStatus.status + '\nServer message: ' + gameStatus.message;
  if (serverStatusChanged(gameStatus)){
    // for email in list of emails...
    for (var i = 0; i < emailAddresses.length; i++){
      var emailAddress = emailAddresses[i];
      sendEmail(emailAddress, emailSubject, emailBody);
    }
    
    // send messages to a list of discord wehhooks/apis
    var discordMessage = 'Fortnite servers are now ' + gameStatus.status + '\nServer message: ' + gameStatus.message;
    for (var i = 0; i < discordWebhookUrls.length; i++){
      var discordUrl = discordWebhookUrls[i];
      sendDiscordMessage(discordUrl, discordMessage);
    }
    
    getSheet('Variables').getRange(serverStatusDataCell).setValue(gameStatus.status); // update server status data cell
  }

  if (!isServerUp(gameStatus)){ // if fortnite servers are down, don't do anything further (prevents unnecesary API calls)
    return;
  }
  
  // object containing all stats objects for all usernames; e.g. jsons[username] returns stats json for that username
  var jsons = getStatsForAllUsers();
  // if request failed, show alert, halt
  if(jsons == false){
    Logger.log('Could not get stats for all users');
    return;
  }
  
  // create sheets for usernames which have none
  for(var i = 0; i < fortniteUsernames.length; i++){
    var ftnUserName = fortniteUsernames[i]; // remember username
    var ftnStatsJson = jsons[ftnUserName] // remember stats for username
    
    if(!sheetExists(ftnUserName)){ // if sheet doesn't exists for username
      // try to create it and and if it was created succesfully...
      if(createSheet(ftnUserName)){
        initializeSheet(ftnUserName);
        insertStatsRow(ftnUserName, ftnStatsJson);
        autoResize(ftnUserName);
      }else{
        Logger.log('A problem has occured trying to create a new sheet for the username ' + ftnUserName);
        return;
      }
    }
    
    // if there is a change in matches played for the username...
    if(playedNewMatch(ftnStatsJson, ftnUserName)){
      // append a row for all users
      for(var i = 0; i < fortniteUsernames.length; i++){
        var username = fortniteUsernames[i];
        var statsJson = jsons[username]
        insertStatsRow(username, statsJson);
      }
    }
  }
  
  // create SPECIAL GRAPHS sheet if it doesn't exist note this if statement and createSpecialChart function can be removed safely
  // it's used to create special charts for myself, you can do something similar too using your username
  if(!sheetExists('silver_chart')){
    createSheet('silver_chart');
    var specialSheet = getSheet('silver_chart');
    // winrate chart
    createSpecialChart('D:D', 1, 1, 'Solo Winrate', 1150, 380, 'silver_chart', 'silver_0_wins');
    // kpd chart
    createSpecialChart('F:F', 19, 1, 'Solo Kpd', 1150, 380, 'silver_chart', 'silver_0_wins');
  }
  
  initializeCharts(); // create charts if charts don't exist
}

function createSpecialChart(range, x, y, title, width, height, graphSheet, dataSheet){
  // range: string; x: int; y: int; title: string; width: int; height; int; graphSheet: string; dataSheet: string
  // Creates chart of a given range, x, y are starting row, column, with a title, width, height, created in graphSheet, using data from dataSheet
  var sheet = getSheet(graphSheet);
  // chart setup
  var chart = sheet.newChart()
  .setChartType(Charts.ChartType.LINE)
  .setPosition(x,y,0,0)
  .setNumHeaders(1)
  .setOption('title', title)
  .setOption('width', width)
  .setOption('height', height)
  .build();
  sheet.insertChart(chart);
  // add range to chart
  chart = chart.modify().addRange(getSheet(dataSheet).getRange(range)).build();
  sheet.updateChart(chart);    
}

function initializeCharts(){
  // if charts don't exist, creates charts
  var sheet = getSheet('Variables');
  var chartsCreatedCell = sheet.getRange(chartsCreatedDataCell).getValue();
  if(chartsCreatedCell == false){
    // create charts for duo
    createChart('I:I', 2, 1, 'Duo Winrate', 805, 250);
    createChart('K:K', 14, 1, 'Duo Kill per Death', 805, 250);
    createChart('H:H', 26, 1, 'Duo Wins', 805, 250);
    createChart('J:J', 38, 1, 'Duo Kills', 805, 250);
    createChart('G:G', 50, 1, 'Duo Matches', 805, 250);
    // create charts for solo
    createChart('D:D', 2, 9, 'Solo Winrate', 805, 250);
    createChart('F:F', 14, 9, 'Solo Kill per Death', 805, 250);
    createChart('C:C', 26, 9, 'Solo Wins', 805, 250);
    createChart('E:E', 38, 9, 'Solo Kills', 805, 250);
    createChart('B:B', 50, 9, 'Solo Matches', 805, 250);    
  }
  sheet.getRange(chartsCreatedDataCell).setValue(true);
}

function createChart(range, x, y, title, width, height){
  // range: string; x: int; y: int; title: string; width: int; height; int
  // Creates a chart with data from all usernames for a given range at x row, y column, with a title, a width and height
  var sheet = getSheet('Graphs');
  // chart setup
  var chart = sheet.newChart()
  .setChartType(Charts.ChartType.LINE)
  .setPosition(x,y,0,0)
  .setNumHeaders(1)
  .setOption('title', title)
  .setOption('width', width)
  .setOption('height', height)
  .build();
  sheet.insertChart(chart);
  // for every username, add corresponding data into chart
  for(var i = 0; i < fortniteUsernames.length; i++){
    var username = fortniteUsernames[i];
    chart = chart.modify().addRange(getSheet(username).getRange(range)).build();
    sheet.updateChart(chart);    
  }
}

function getStatsForAllUsers(){
  // returns json; dictionary association of username: json for every username; where json contains username's stats
  var jsons = {}; 
  for(var i = 0; i < fortniteUsernames.length; i++){
    var ftnUserName = fortniteUsernames[i];
    var ftnStatsJson = getResponse(ftnUserName); // API call * fortniteUsernames.length
    jsons[ftnUserName] = ftnStatsJson; // add association username: json to jsons
    if(ftnStatsJson == false){ // if request has failed
      return false;
    }
  }
  return jsons;
}

function sendDiscordMessage(webhookUrl, message){
  var data = {
    'content' : message
  }
  var options = {
    'method' : 'POST',
    'headers': {'Content-Type': 'application/json'},
    'payload': JSON.stringify(data)
  };
  UrlFetchApp.fetch(webhookUrl, options);
}

function sendEmail(emailAddress, subject, message){
  MailApp.sendEmail(emailAddress, subject, message);
}

function serverStatusChanged(gameStatus){
  var lastServerStatus = getSheet('Variables').getRange(serverStatusDataCell).getValue();
  var newServerStatus = gameStatus.status;
  return (lastServerStatus != newServerStatus);
}

function initializeVariables(gameStatus){
  // gameStatus: json; initializes variables sheet
  var sheet = getSheet('Variables');
  var serverStatusCell = sheet.getRange(serverStatusDataCell).getValue();
  if(serverStatusCell == ''){
    sheet.getRange(serverStatusDataCell).setValue(gameStatus.status);
  }
  
  var chartsCreatedCell = sheet.getRange(chartsCreatedDataCell).getValue();
  if(chartsCreatedCell == ''){
    sheet.getRange(chartsCreatedDataCell).setValue('false');
  }
}

function updateServerMessages(gameStatus){
  var sheet = getSheet('Graphs');
  sheet.getRange(serverStatusRange).setValue('servers: ' + gameStatus.status);
  sheet.getRange(serverMessageRange).setValue(gameStatus.message);
}

function initializeSpreadsheet(){
  // create graphs sheet
  if(!sheetExists('Graphs')){
    createSheet('Graphs');
    var graphsSheet = getSheet('Graphs');
    // merge cells that display title, server status and server message
    graphsSheet.getRange(titleRange).merge();
    graphsSheet.getRange(serverStatusRange).merge();
    graphsSheet.getRange(serverMessageRange).merge();
    // set title
    graphsSheet.getRange(titleRange).setValue('Fortnite stats solo and duo');
    // color the backgrounds of ranges
    graphsSheet.getRange(titleRange).setBackground(titleBackgroundColor);
    graphsSheet.getRange(serverStatusRange).setBackground(serverStatusBackgroundColor);
    graphsSheet.getRange(serverMessageRange).setBackground(serverMessageBackgroundColor);
    // color the fonts
    graphsSheet.getRange(titleRange).setFontColor(titleFontColor);
    graphsSheet.getRange(serverStatusRange).setFontColor(serverStatusFontColor);
    graphsSheet.getRange(serverMessageRange).setFontColor(serverMessageFontColor);
    // set font sizes
    graphsSheet.getRange(titleRange).setFontSize(titleFontSize);
    graphsSheet.getRange(serverStatusRange).setFontSize(serverStatusFontSize);
    graphsSheet.getRange(serverMessageRange).setFontSize(serverMessageFontSize);
    // set fonts bold
    graphsSheet.getRange(titleRange).setFontWeight('bold');
    graphsSheet.getRange(serverStatusRange).setFontWeight('bold');
    graphsSheet.getRange(serverMessageRange).setFontWeight('bold');
  }
  // create variables sheet
  if(!sheetExists('Variables')){
    createSheet('Variables');
  }
}

function playedNewMatch(json, sheetName){
  // json: JSON; sheetName: string; returns bool; whether there is any change in matches played 
  var lastSoloMatches = getLastValueFromColumn(sheetName, soloMatchesColumn);
  var lastDuoMatches = getLastValueFromColumn(sheetName, duoMatchesColumn); 
  
  var newSoloMatches = json.br.stats.pc.solo.matchesPlayed;
  var newDuoMatches = json.br.stats.pc.duo.matchesPlayed;
  
  return (((newSoloMatches > lastSoloMatches) || (newDuoMatches > lastDuoMatches)))
}

function initializeSheet(sheetName){
  // sheetName: string; formats new sheets
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheet(sheetName);
  var row = ['entry','solo matches '+sheetName,'solo wins '+sheetName,'solo winrate '+sheetName,'solo kills '+sheetName,'solo kpd '+sheetName,
             'duo matches '+sheetName,'duo wins '+sheetName,'duo winrate '+sheetName,'duo kills '+sheetName,'duo kpd '+sheetName,
             'time', 'date'];
  sheet.appendRow(row);
  autoResize(sheetName);
}

function getLastRowNumber(sheetName){
  // sheetName: string; return integer; returns the last row number based on column A
  var sheet = getSheet(sheetName);
  var column = sheet.getRange('A:A');
  var values = column.getValues(); // get all data in one call
  var ct = 0;
  while (values[ct][0] != "") {
    ct++;
  }
  return (ct);
}

function getLastValueFromColumn(sheetName, column){
  // returns the last numerical value from a column, otherwise 0; sheetName: string; column: string; returns integer
  var sheet = getSheet(sheetName);

  var lastRowNumber = getLastRowNumber(sheetName);
  try{
    var lastMatches = parseInt(sheet.getRange(column + lastRowNumber.toString()).getValue());
    if (isNaN(lastMatches)){
      return 0;
    }else{
      return lastMatches;
    }
  }
  catch(err){
    return 0;
  }
}

function getGamestatusJson(){
  // returns json
  var url = "https://fortnite.y3n.co/v2/gamestatus";
  var options = {
    'headers': {'X-Key': key}
  };
  var response = UrlFetchApp.fetch(url, options);
  var text = response.getContentText();
  var json = JSON.parse(text);
  return(json);
}

function getResponse(ftname){
  // ftnName: string; returns json
  var url = "https://fortnite.y3n.co/v2/player/" + ftname;
  var options = {
    'headers': {'X-Key': key}
  };
  try{
    var response = UrlFetchApp.fetch(url, options);
    var text = response.getContentText();
    var json = JSON.parse(text);
    return json;
  }
  catch(err){
    Logger.log(err); // LOG
    return false;
  }
}

function insertStatsRow(sheetName, json){
  // sheetName: string; json: JSON; inserts a stats row
  var sheet = getSheet(sheetName);
  // prepare solo data
  var soloWins = json.br.stats.pc.solo.wins;
  var soloWinrate = json.br.stats.pc.solo.winRate;
  var soloKills = json.br.stats.pc.solo.kills;
  var soloMatches = json.br.stats.pc.solo.matchesPlayed;
  var soloKpd = json.br.stats.pc.solo.kpd;
  // prepare duo data
  var duoWins = json.br.stats.pc.duo.wins;
  var duoWinrate = json.br.stats.pc.duo.winRate;
  var dupKills = json.br.stats.pc.duo.kills;
  var duoMatches = json.br.stats.pc.duo.matchesPlayed;
  var duoKpd = json.br.stats.pc.duo.kpd;
  // prepare the rest of the data
  var lastEntry = getLastValueFromColumn(sheetName, entryColumn);
  var newEntry = lastEntry + 1;
  var date = currentDate();
  var time = currentTime();
  // prepare row
  var row = [newEntry, soloMatches, soloWins, soloWinrate, soloKills, soloKpd, duoMatches, duoWins, duoWinrate, dupKills, duoKpd, time, date];
  sheet.appendRow(row)
}

function sendChartsToEmails(){
  var sheet = getSheet('Graphs');
  var charts = sheet.getCharts();
  if(charts.length > 0){
    // setup email template
    var template = HtmlService.createTemplateFromFile("graphImage");
    template.date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-y");

    var imageNames = ["duoWinrateImgBlob","duoKpdImgBlob","duoWinsImgBlob","duoKillsImgBlob","duoMatchesImgBlob","soloWinrateImgBlob",
                      "soloKpdImgBlob","soloWinsImgBlob","soloKillsImgBlob","soloMatchesImgBlob"]
    
    // collect img blobs
    var imgBlobs = [];
    for(var i = 0; i < imageNames.length; i++){
      var chart = charts[i];
      var imgBlob = chart.getBlob().getAs('image/png').setName(imageNames[i]);
      imgBlobs.push(imgBlob);
    }
    
    // send email to list of emails
    for(var i = 0; i < emailAddresses.length; i++){
      var emailAddress = emailAddresses[i];
      Logger.log(emailAddress);
      MailApp.sendEmail({to:emailAddress,
                        subject: "Fortnite stats charts.",
                        htmlBody: template.evaluate().getContent(),
                        inlineImages: {
                          duoWinrate: imgBlobs[0],
                          duoKpd: imgBlobs[1],
                          duoWins: imgBlobs[2],
                          duoKills: imgBlobs[3],
                          duoMatches: imgBlobs[4],
                          soloWinrate: imgBlobs[5],
                          soloKpd: imgBlobs[6],
                          soloWins: imgBlobs[7],
                          soloKills: imgBlobs[8],
                          soloMatches: imgBlobs[9]
                        }
                      });
    }
  }
}


function createSheet(sheetName){
  // sheetName: string; returns bool
  if(sheetExists(sheetName)){
    return false;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var newSheet = ss.insertSheet();
  newSheet.setName(sheetName);
  return true;
}

function autoResize(sheetName){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheet(sheetName);
  sheet.autoResizeColumns(1,8);
}

function isServerUp(gameStatus){
  // gameStatus: json; returns bool
  return(gameStatus.status == 'UP');
}

function sendChartToDiscord(){
    for(var i = 0; i < discordWebhookUrls.length; i++){
      var discordWebhook = discordWebhookUrls[i];
      sendDiscordMessage(discordWebhook, chartsLink);
    }
}

function getSheet(sheetName){
  // sheetName: string; returns sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  return sheet;
}

function currentDate(){
  // returns a string 
  var date = Utilities.formatDate(new Date(), "GMT+2", "dd/MM/yyyy"); // formated date 
  return date;
}

function currentTime(){
  // returns a string
  var d = new Date();
  var currentTime = d.toLocaleTimeString().substring(0,11);
  return currentTime;
}

function sheetExists(sheetName){
  // sheetName: string; returns bool
  var newSheet = getSheet(sheetName);
  return(newSheet != null);
}

function isSheetEmpty(sheet) {
  // sheet: sheet; returns bool
  return sheet.getDataRange().getValues().join("") === "";
}


// deprecated functions
function sendChartsImagesToDiscordWebhooks(){
  var sheet = getSheet('Graphs');
  var charts = sheet.getCharts();
  var imageNames = ["duoWinrateImg", 'duoKpdImg'];
  
  for(var i = 0; i < imageNames.length; i++){
    var chart = charts[i];
    var imgBlob = chart.getBlob().getAs('image/png').setName(imageNames[i]);
    var file = DriveApp.createFile(imgBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // make public
    fileUrl = file.getUrl();
    
    for(var i = 0; i < discordWebhookUrls.length; i++){
      var discordWebhook = discordWebhookUrls[i];
      sendDiscordMessage(discordWebhook, fileUrl);
    }
  }
}

function setupUI(){
  SpreadsheetApp.getUi()
  .createMenu('Custom Menu')
  .addItem('Show alert', 'showAlert')
  .addToUi();
}

function showAlert(message1, message2, confirmationMessage) {
  // message1: strng; message2: string; confirmationMessage: string
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert(message1, message2, ui.ButtonSet.OK);
  if (result == ui.Button.OK) {
    ui.alert(confirmationMessage);
  }
}

function renameSheet(sheetName, newSheetName){
  if(sheetExists(sheetName)){
    var sheet = getSheet(sheetName);
    sheet.setName(newSheetName);
  }else{
    Logger.log('Error trying to rename sheet ' + sheetName + ', sheet does not exists.');
  }
}

// debugging functions
