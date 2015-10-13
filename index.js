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

averagesBernie = {newAvg: 0, oldAvg: 0}
nBernie = 0;
nPositiveBernie = 0;
nNegativeBernie = 0;
nNeutralBernie = 0;

averagesHillary = {newAvg: 0, oldAvg: 0}
nHillary = 0;
nPositiveHillary = 0;
nNegativeHillary = 0;
nNeutralHillary = 0;


// io.on('streamTopic', function(msg){
//   console.log(msg)
// })



twitterClient.stream('statuses/filter', {track: "Bernie Sanders,BernieSanders"}, function(stream) {
  stream.on('data', function(tweet) {
    var data = {text: tweet.text};
    hodClient.call('analyzesentiment', data, function(err, resp){
      if (!err) {
        if (resp.body.aggregate !== undefined) {
          nBernie += 1; //increase n by one
          var sentiment = resp.body.aggregate.sentiment;
          var score = resp.body.aggregate.score;
          if (score > 0) {
            nPositiveBernie += 1;
          } else if(score < 0) {
            nNegativeBernie += 1;
          } else {
            nNeutralBernie += 1;
          }
          averagesBernie = calculateRunningAverage(score, nBernie, averagesBernie);
          rgbInstantaneous = mapColor(score);
          rgbAverage = mapColor(averagesBernie.newAvg);
          console.log("------------------------------");
          console.log(tweet.text + " | " + sentiment + " | " + score);
          var tweetData = {tweet: tweet, positive: resp.body.positive, negative: resp.body.negative, aggregate: resp.body.aggregate, rgbInstantaneous: rgbInstantaneous, rgbAverage: rgbAverage, average: averagesBernie.newAvg, n: nBernie, nNeutral: nNeutralBernie, nNegative: nNegativeBernie, nPositive: nPositiveBernie};
          io.emit('tweetDataBernie', tweetData);
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

twitterClient.stream('statuses/filter', {track: "Hillary Clinton,HillaryClinton"}, function(stream) {
  stream.on('data', function(tweet) {
    var data = {text: tweet.text};
    hodClient.call('analyzesentiment', data, function(err, resp){
      if (!err) {
        if (resp.body.aggregate !== undefined) {
          nHillary += 1; //increase n by one
          var sentiment = resp.body.aggregate.sentiment;
          var score = resp.body.aggregate.score;
          if (score > 0) {
            nPositiveHillary += 1;
          } else if(score < 0) {
            nNegativeHillary += 1;
          } else {
            nNeutralHillary += 1;
          }
          averagesHillary = calculateRunningAverage(score, nHillary, averagesHillary);
          rgbInstantaneous = mapColor(score);
          rgbAverage = mapColor(averagesHillary.newAvg);
          console.log("------------------------------");
          console.log(tweet.text + " | " + sentiment + " | " + score);
          var tweetData = {tweet: tweet, positive: resp.body.positive, negative: resp.body.negative, aggregate: resp.body.aggregate, rgbInstantaneous: rgbInstantaneous, rgbAverage: rgbAverage, average: averagesHillary.newAvg, n: nHillary, nNeutral: nNeutralHillary, nNegative: nNegativeHillary, nPositive: nPositiveHillary};
          io.emit('tweetDataHillary', tweetData);
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

calculateRunningAverage = function(score, n, averages) {
  averages.newAvg = averages.oldAvg * (n-1)/n + score/n;   // New average = old average * (n-1)/n + new value /n
  averages.oldAvg = averages.newAvg; //set equal to new average for next go around of calling this function
  return averages
}
