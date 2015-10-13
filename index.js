require('dotenv').load();

var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);
var Twitter = require('twitter');
var havenondemand = require('havenondemand');

var hodClient = new havenondemand.HODClient('http://api.havenondemand.com', process.env.hpe_apikey);

var twitterClient = new Twitter({
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token_key: process.env.access_token,
  access_token_secret: process.env.access_token_secret
});

port = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, 'public')));

newAverage = 0;
oldAverage = 0;
n = 0;

// io.on('streamTopic', function(msg){
//   console.log(msg)
// })

io.on('connection', function(socket){

  socket.on('disconnect', function () {
    socket.emit('user disconnected');
  });

  socket.on('streamTopic', function(msg){
    newAverage = 0;
    oldAverage = 0;
    n = 0;
    console.log(msg);
    twitterClient.stream('statuses/filter', {track: msg.topic}, function(stream) {
      stream.on('data', function(tweet) {
        var data = {text: tweet.text};
        hodClient.call('analyzesentiment', data, function(err, resp){
          if (!err) {
            if (resp.body.aggregate !== undefined) {
              n += 1; //increase n by one
              var sentiment = resp.body.aggregate.sentiment;
              var score = resp.body.aggregate.score;
              newAverage = calculateRunningAverage(score, n);
              rgbInstantaneous = mapColor(score);
              rgbAverage = mapColor(newAverage);
              console.log("------------------------------");
              console.log(tweet.text + " | " + sentiment + " | " + score);
              var tweetData = {tweet: tweet, positive: resp.body.positive, negative: resp.body.negative, aggregate: resp.body.aggregate, rgbInstantaneous: rgbInstantaneous, rgbAverage: rgbAverage, average: newAverage};
              io.emit('tweetData', tweetData);
            }
          }
        });
      });

      stream.on('disconnect', function (disconnectMessage) {
        console.log(disconnectMessage);
      });

      stream.on('error', function(error) {
        throw error;
      });
    });
  });

});

app.get("/", function(req, res){
  res.sendFile(__dirname + '/views/index.html');
});

http.listen(port, function(){
  console.log("Listening on port: "+port);
});

mapColor = function (score) {
  weight = Math.floor(((0.5*score + 0.5)*100));
  r = Math.floor( (255 * (100 - weight)) / 100 );
  g = Math.floor( (255 * weight) / 100 );
  b = 0;
  return {r: r, g: g, b:b};
}

calculateRunningAverage = function(score, n) {
  newAverage = oldAverage * (n-1)/n + score/n;   // New average = old average * (n-1)/n + new value /n
  oldAverage = newAverage; //set equal to new average for next go around of calling this function
  return newAverage;
}
