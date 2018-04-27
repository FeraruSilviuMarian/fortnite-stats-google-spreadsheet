// This spreadsheet can be used to visualize your forntite statistics, as you play games the data will be automatically updated. 
// Note, optionally you can add sendChartsToEmails() and sendChartToDiscord() as weekly triggers to recieve reports
// for that you will need to make a webhook from discord, and publish your chart and include it here, it is optional functionality however.
 
// Add any number of usernames to the "fortniteUsernames" array and add main() as a time-driven trigger (5 minutes would be a good interval).
var fortniteUsernames = ['username1', 'username2', 'etc'];
// Get an api key by direct messaging @Fortnite Stats on discord, with the message !getapikey  visit https://fortnite.y3n.co/ for more details
var key = 'yourKeyHere';
// Everything else will be set up automatically.

// if the servers status changes emails will be sent to these addresses, you can add as many as you want
var emailAddresses = ['email1', 'email2', 'etc'];
// Discord webhook urls, a list of discord webhooks / routes, when server status changes, messages will be sent to these webhooks
var discordWebhookUrls = ['webhook1', 'webhook2', 'etc'];
// optionally you can publish your charts so it can be sent to you on discord as a weekly report for example, add sendChartToDiscord() as a trigger
var chartsLink = 'your published chart goes here, if you want to recieve it on discord';

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
  setupUI();
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
    showAlert('An error has occured', 'Request failed, fortnite username does not exists', 'Please use a different username.');   
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
  
  initializeCharts(); // create charts if charts don't exist
}


function showAlert(message1, message2, confirmationMessage) {
  // message1: strng; message2: string; confirmationMessage: string
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert(message1, message2, ui.ButtonSet.OK);
  if (result == ui.Button.OK) {
    ui.alert(confirmationMessage);
  }
}

function setupUI(){
  SpreadsheetApp.getUi()
  .createMenu('Custom Menu')
  .addItem('Show alert', 'showAlert')
  .addToUi();
}

function sendChartToDiscord(){
    for(var i = 0; i < discordWebhookUrls.length; i++){
      var discordWebhook = discordWebhookUrls[i];
      sendDiscordMessage(discordWebhook, chartsLink);
    }
}

function initializeCharts(){
  // if charts doesn't exists, creates charts
  var sheet = getSheet('Variables');
  var chartsCreatedCell = sheet.getRange(chartsCreatedDataCell).getValue();
  if(chartsCreatedCell == false){
    // create charts for duo
    createChart('I1:I', 2, 1, 'Duo Winrate', 805, 250);
    createChart('K1:K', 14, 1, 'Duo Kill per Death', 805, 250);
    createChart('H1:H', 26, 1, 'Duo Wins', 805, 250);
    createChart('J1:J', 38, 1, 'Duo Kills', 805, 250);
    createChart('G1:G', 50, 1, 'Duo Matches', 805, 250);
    // create charts for solo
    createChart('D1:D', 2, 9, 'Solo Winrate', 805, 250);
    createChart('F1:F', 14, 9, 'Solo Kill per Death', 805, 250);
    createChart('C1:C', 26, 9, 'Solo Wins', 805, 250);
    createChart('E1:E', 38, 9, 'Solo Kills', 805, 250);
    createChart('B1:B', 50, 9, 'Solo Matches', 805, 250);    
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
  // rename first sheet
  if(sheetExists('Sheet1')){
    renameSheet('Sheet1', 'Graphs');
    var graphsSheet = getSheet('Graphs');
    // merge cells that display title, server status and server message
    graphsSheet.getRange(titleRange).merge();
    graphsSheet.getRange(serverStatusRange).merge();
    graphsSheet.getRange(serverMessageRange).merge();
    // set title
    graphsSheet.getRange(titleRange).setValue('Fortnite stats solo and duo');
    // color the backgrounds of ranges
    graphsSheet.getRange(titleRange).setBackground('#e56030');
    graphsSheet.getRange(serverStatusRange).setBackground('#e56030');
    graphsSheet.getRange(serverMessageRange).setBackground('#e56030');
    // color the fonts
    graphsSheet.getRange(titleRange).setFontColor('white');
    graphsSheet.getRange(serverStatusRange).setFontColor('white');
    graphsSheet.getRange(serverMessageRange).setFontColor('white');
    // set font sizes
    graphsSheet.getRange(titleRange).setFontSize(14);
    graphsSheet.getRange(serverStatusRange).setFontSize(14);
    graphsSheet.getRange(serverMessageRange).setFontSize(14);
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

function renameSheet(sheetName, newSheetName){
  if(sheetExists(sheetName)){
    var sheet = getSheet(sheetName);
    sheet.setName(newSheetName);
  }else{
    Logger.log('Error trying to rename sheet ' + sheetName + ', sheet does not exists.');
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

function autoResize(sheetName){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheet(sheetName);
  sheet.autoResizeColumns(1,8);
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

function sheetExists(sheetName){
  // sheetName: string; returns bool
  var newSheet = getSheet(sheetName);
  return(newSheet != null);
}

function isSheetEmpty(sheet) {
  // sheet: sheet; returns bool
  return sheet.getDataRange().getValues().join("") === "";
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

function getSheet(sheetName){
  // sheetName: string; returns sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  return sheet;
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

function isServerUp(gameStatus){
  // gameStatus: json; returns bool
  return(gameStatus.status == 'UP');
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

    // prepare chart images
    var duoWinrateChart = charts[0];
    var duoWinrateImgBlob =  duoWinrateChart.getBlob().getAs('image/png').setName("duoWinrateImgBlob");
    
    var duoKpdChart = charts[1];
    var duoKpdImgBlob =  duoKpdChart.getBlob().getAs('image/png').setName("duoKpdImgBlob");
    
    var duoWinsChart = charts[2];
    var duoWinsImgBlob =  duoWinsChart.getBlob().getAs('image/png').setName("duoWinsImgBlob"); 

    var duoKillsChart = charts[3];
    var duoKillsImgBlob =  duoKillsChart.getBlob().getAs('image/png').setName("duoKillsImgBlob");
    
    var duoMatchesChart = charts[4];
    var duoMatchesImgBlob =  duoMatchesChart.getBlob().getAs('image/png').setName("duoMatchesImgBlob");
    
    var soloWinrateChart = charts[5];
    var soloWinrateImgBlob =  soloWinrateChart.getBlob().getAs('image/png').setName("soloWinrateImgBlob");
    
    var soloKpdChart = charts[6];
    var soloKpdImgBlob =  soloKpdChart.getBlob().getAs('image/png').setName("soloKpdImgBlob");
    
    var soloWinsChart = charts[7];
    var soloWinsImgBlob =  soloWinsChart.getBlob().getAs('image/png').setName("soloWinsImgBlob");

    var soloKillsChart = charts[8];
    var soloKillsImgBlob =  soloKillsChart.getBlob().getAs('image/png').setName("soloKillsImgBlob");

    var soloMatchesChart = charts[9];
    var soloMatchesImgBlob =  soloMatchesChart.getBlob().getAs('image/png').setName("soloMatchesImgBlob");
    
    // send email to list of emails
    for(var i = 0; i < emailAddresses.length; i++){
      var emailAddress = emailAddresses[i];
      Logger.log(emailAddress);
      MailApp.sendEmail({to:emailAddress,
                        subject: "Fortnite stats charts.",
                        htmlBody: template.evaluate().getContent(),
                        inlineImages: {
                          duoWinrate: duoWinrateImgBlob,
                          duoKpd: duoKpdImgBlob,
                          duoWins: duoWinsImgBlob,
                          duoKills: duoKillsImgBlob,
                          duoMatches: duoMatchesImgBlob,
                          soloWinrate: soloWinrateImgBlob,
                          soloKpd: soloKpdImgBlob,
                          soloWins: soloWinsImgBlob,
                          soloKills: soloKillsImgBlob,
                          soloMatches: soloMatchesImgBlob
                        }
                      });
    }
  }
}



// deprecated functions
function sendChartsImagesToDiscordWebhooks(){
  var sheet = getSheet('Graphs');
  var charts = sheet.getCharts();
  
  // prepare chart images urls
  var duoWinrateChart = charts[0];
  var duoWinrateImgBlob =  duoWinrateChart.getBlob().getAs('image/png').setName("duoWinrateImg");
  var duoWinrateFile = DriveApp.createFile(duoWinrateImgBlob);
  duoWinrateFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // make public
  var duoWinrateFileUrl = duoWinrateFile.getUrl();

  var duoKpdChart = charts[1];
  var duoKpdImgBlob =  duoKpdChart.getBlob().getAs('image/png').setName("duoKpdImg");
  var duoKpdFile = DriveApp.createFile(duoKpdImgBlob);
  duoKpdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // make public
  var duoKpdFileUrl = duoKpdFile.getUrl();
  
  for(var i = 0; i < discordWebhookUrls.length; i++){
    var discordWebhook = discordWebhookUrls[i];
    sendDiscordMessage(discordWebhook, duoWinrateFileUrl);
    sendDiscordMessage(discordWebhook, duoKpdFileUrl);
  }
}
