var cron = require('node-cron');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
const fs = require('fs')

//function used to reset daily limit
const { resetLimit } =  require('./resetLimit.js')

//Load mongodb config
let rawdata = fs.readFileSync('config.json');
let config = JSON.parse(rawdata);

let urlMongodb = 'mongodb+srv://'+config["dbuser"]+':'+config["dbpass"]+'@'+config["dbhost"]+'/'+config["dbname"]+'?retryWrites=true&w=majority'
mongoose.connect(urlMongodb,{ useNewUrlParser: true,useUnifiedTopology: true });
mongoose.set('useFindAndModify', false);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
});

// Cron job, to reset daily limits for all users every days at 00:00
cron.schedule('0 0 * * *', () => {
  resetLimit()
  console.log('Reset daily limits');
}, {
  scheduled: true,
  timezone: "Europe/Paris"
});


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var index = require('./routes/index');
app.use('/', index);

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message);
});


// listen on port 3000
app.listen(process.env.PORT || 3000, () => console.log("Server is running..."));