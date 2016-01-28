require('dotenv').load();

var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);
var Twitter = require('twitter');
var havenondemand = require('havenondemand');
var async = require("async");

var hodClient = new havenondemand.HODClient(process.env.hpe_apikey);

var twitterClient = new Twitter({
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token_key: process.env.access_token,
  access_token_secret: process.env.access_token_secret
});

port = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var candidateString = "SenSanders,HillaryClinton,realDonaldTrump,tedcruz,marcorubio,RealBenCarson"
var window1 = 10;

var candidateNumbers = {
  "SenSanders": {
    averages: {newAvg: 0, oldAvg: 0},
    n: 0,
    nPositive: 0,
    nNegative: 0,
    nNeutral: 0,
    runningAverageWindow1: 0,
    nWindow1: 0,
    runningAverageWindow1Array: []
  },
  "HillaryClinton": {
    averages: {newAvg: 0, oldAvg: 0},
    n: 0,
    nPositive: 0,
    nNegative: 0,
    nNeutral: 0,
    runningAverageWindow1: 0,
    nWindow1: 0,
    runningAverageWindow1Array: []
  },
  "realDonaldTrump": {
      averages: {newAvg: 0, oldAvg: 0},
      n: 0,
      nPositive: 0,
      nNegative: 0,
      nNeutral: 0,
      runningAverageWindow1: 0,
      nWindow1: 0,
      runningAverageWindow1Array: []
  },
  "tedcruz": {
    averages: {newAvg: 0, oldAvg: 0},
    n: 0,
    nPositive: 0,
    nNegative: 0,
    nNeutral: 0,
    runningAverageWindow1: 0,
    nWindow1: 0,
    runningAverageWindow1Array: []
  },
  "marcorubio": {
    averages: {newAvg: 0, oldAvg: 0},
    n: 0,
    nPositive: 0,
    nNegative: 0,
    nNeutral: 0,
    runningAverageWindow1: 0,
    nWindow1: 0,
    runningAverageWindow1Array: []
  },
  "RealBenCarson": {
    averages: {newAvg: 0, oldAvg: 0},
    n: 0,
    nPositive: 0,
    nNegative: 0,
    nNeutral: 0,
    runningAverageWindow1: 0,
    nWindow1: 0,
    runningAverageWindow1Array: []
  }
}

var articleUpdateInterval = 60000*15; //15 minutes

var candidateArticles = {
  "Bernie Sanders": {articles: [], concepts: []},
  "Hillary Clinton": {articles: [], concepts: []},
  "Donald Trump": {articles: [], concepts: []},
  "Ted Cruz": {articles: [], concepts: []},
  "Marco Rubio": {articles: [], concepts: []},
  "Ben Carson": {articles: [], concepts: []}
};

app.get("/", function(req, res){
  res.render('index', {
    candidateArticles: candidateArticles,
    candidateConcepts: candidateArticles["Bernie Sanders"].concepts
  });
});

http.listen(port, function(){
  console.log("Listening on port: "+port);
});

// twitterClient.stream('statuses/filter', {track: candidateString}, function(stream) {
//   stream.on('data', function(tweet) {
//     if (tweet.entities !== undefined) {
//       var userMentions = tweet.entities.user_mentions;
//       for (var i=0; i<userMentions.length; i++) {
//         var screenName = userMentions[i].screen_name;
//         if (candidateNumbers[screenName] !== undefined) {
//           twitterStream(screenName, candidateNumbers[screenName], tweet)
//         }
//       }
//     }
//   });
//
//   stream.on('disconnect', function (disconnectMessage) {
//     console.log(disconnectMessage);
//   });
//
//   stream.on('error', function(error) {
//     throw error;
//   });
// });

function twitterStream(candidate, candidateData, tweetObject) {
  var data = {text: tweetObject.text};
  hodClient.call('analyzesentiment', data, function(err, resp){
    // debugger;
    if (!err && !resp.body.error) {
      if (resp.body.aggregate !== undefined) {
        candidateData.n += 1; //increase n by one
        candidateData.nWindow1 +=1 ; //increase by one
        var sentiment = resp.body.aggregate.sentiment;
        var score = 10.0/3.0*(resp.body.aggregate.score*100.0)+50.0; //map from -15 to 15 to 0 to 100 ... y =10/3*x+50
        if (score > 50) {
          candidateData.nPositive += 1;
        } else if(score < 50) {
          candidateData.nNegative += 1;
        } else {
          candidateData.nNeutral += 1;
        }
        //perform running averages window
        candidateData.runningAverageWindow1Array.push(score);
        if (candidateData.runningAverageWindow1Array.length > window1) { //if there is enough data points in the window
          candidateData.runningAverageWindow1Array.splice(0,1);
          candidateData.runningAverageWindow1 = calculateRunningAverageWindow(candidateData.runningAverageWindow1Array, window1)
        }
        //
        candidateData.averages = calculateRunningAverage(score, candidateData.n, candidateData.averages);
        rgbInstantaneous = mapColor(score);
        rgbAverage = mapColor(candidateData.averages.newAvg);
        console.log("------------------------------");
        console.log(tweetObject.text + " | " + sentiment + " | " + score);
        var tweetData = {candidate: candidate, tweet: tweetObject, positive: resp.body.positive, negative: resp.body.negative, aggregate: resp.body.aggregate, rgbInstantaneous: rgbInstantaneous, rgbAverage: rgbAverage, average: candidateData.averages.newAvg, averageWindow1: candidateData.runningAverageWindow1, n: candidateData.n, nNeutral: candidateData.nNeutral, nNegative: candidateData.nNegative, nPositive: candidateData.nPositive};
        io.emit('message', tweetData);
      }
    } else {
      if (resp.body.error) {console.log(resp.body.error);}
      console.log("------------------");
      console.log(err);
    }
  });
}

// functions for updating articles
updateCandidateArticles();
setInterval(updateCandidateArticles(), articleUpdateInterval);

function updateCandidateArticles() {
  async.forEachOf(candidateArticles, function (value1, key1, callback1) {
    candidateArticles[key1].concepts = []; //delete the old concepts for the candidate
    var data1 = {text: key1, indexes: ['news_eng'], summary: 'quick', total_results: 'false'};
    hodClient.call('querytextindex', data1, function(err1, resp1) {
      if (!err1 && !resp1.body.error) {
        console.log(resp1.body.documents);
        var articles = resp1.body.documents;
        candidateArticles[key1].articles = articles;
        async.each(articles, function (article, callback2) {
          console.log(article)
          var data2 = {url: article.reference};
          hodClient.call('viewdocument', data2, function(err3, resp3) {
            if (!err3 && !resp3.body.error) {
              var html = resp3.body;
              article.html = html;
            } else {
              console.log(resp3);
              console.log(err3);
            }
          });
          hodClient.call('extractconcepts', data2, function(err2, resp2) {
            var concepts = resp2.body.concepts;
            async.each(concepts, function(concept, callback) {
              var newDict = {"text": concept.concept, "size": concept.occurrences}
              candidateArticles[key1].concepts.push(newDict);
            }, function (err) {
              if (err) console.error(err.message);
            });
          });
        }, function (err) {
          if (err) console.error(err.message);
        });
      } else {
        console.log("------------------");
        if (resp1.body.error) {console.log(resp1.body.error);}
        console.log(err1);
      }
    });
  }, function (err) {
      if (err) console.error(err.message);
  });
}

setInterval(function(){debugger;}, 6000);

function mapColor(score) {
  weight = Math.floor(((0.5*score + 0.5)*100));
  r = Math.floor( (255 * (100 - weight)) / 100 );
  g = Math.floor( (255 * weight) / 100 );
  b = 0;
  return {r: r, g: g, b:b};
}

function calculateRunningAverage(score, n, averages) {
  averages.newAvg = averages.oldAvg * (n-1)/n + score/n;   // New average = old average * (n-1)/n + new value /n
  averages.oldAvg = averages.newAvg; //set equal to new average for next go around of calling this function
  return averages;
}

function calculateRunningAverageWindow(array, win) {
  var runsum = 0.0;
  for (var i=0; i<win; i++) {
    runsum += array[i];
  }
  var avg = runsum/win;
  return avg;
}
