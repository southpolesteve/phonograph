// Load packages
var express = require('express');
var request = require('request');
var markdown = require('markdown').markdown;
var RSVP = require('rsvp');
var url = require('url');
var morgan = require('morgan');
var mime = require('mime');

var repo = 'southpolesteve/yahara';

var cache = {};

var app = express();
var port = process.env.PORT || 8000

app.use(morgan());

loadConfig().then(function(config){
  loadPath(config.appFolder, {dir: true}).then(function(){

    // Setup middleware for app folder
    app.use(function (req, res, next) {
      if (cache.hasOwnProperty(config.appFolder+req.url)) {
        res.set('Content-Type', mime.lookup(req.url));
        res.send(cache[config.appFolder+req.url]);
      } else {
        next();
      }
    });

    // Catch all route that points to main app HTML
    app.get('/*', function(req, res){
      res.send(cache[config.app]);
    });

    // Start the server
    console.log('Server running on port: ' + port)
    app.listen(port);
  })
})

function loadConfig(){
  return loadPath('phonograph.json', {raw: true, json: true});
}

function loadPath(path, options){
  return new RSVP.Promise(function(resolve, reject) {
    var url = 'https://api.github.com/repos/'+repo+'/contents/'+ path

    var reqOptions = {
      url: url,
      headers: {
        'User-Agent': 'Yahara',
      }
    };

    if (options && options.raw) {
      reqOptions.headers['Accept'] = 'application/vnd.github.v3.raw';
    }

    request(reqOptions, function(error, response, body){
      if (!error && response.statusCode == 200) {
        console.log("Loaded: " + path)

        if (options && (options.json || options.dir)) {
          body = JSON.parse(body);
        }

        if (options && options.dir) {
          var promises = body.map(function(file){
            if (file.type == 'dir'){
              return loadPath(file.path, {dir: true});
            } else {
              return loadPath(file.path, {raw: true});
            }
          })
          resolve(RSVP.all(promises))
        } else {
          cache[path] = body
          resolve(body);
        }
      }
      else {
        reject(error)
      }
    })
  });
}

// var config = yaml.safeLoad('The Repo URL');
// var cache = {}
//
// var compress = config.compress || true
// var logger = config.logger || true
// var appUrl = config.app || '/dist/index.html'
//
// if (logger) {
//   app.use(express.logger());
// }
//
// if (compress) {
//   app.use(express.compress());
// }
//
// app.use(express.static(__dirname + '/dist'));
// app.use(express.static(__dirname + '/public'));
//
// app.get('/pages/:page', function(req, res){
//   var pageName = req.params.page;
//   var options = {
//     url: 'https://api.github.com/repos/southpolesteve/yahara/contents/app/pages/' + pageName + '.md',
//     headers: {
//       'User-Agent': 'Yahara'
//     }
//   };
//
//   request(options, function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//       content = new Buffer(JSON.parse(body).content, 'base64').toString('ascii')
//       res.send({'html': markdown.toHTML(content)})
//     }
//     else {
//       fs.readFile(__dirname +'/app/pages/'+ pageName +'.md', 'utf8', function (err, data) {
//         if (err) {
//             res.send(404)
//         }
//         else {
//           res.send({'html': markdown.toHTML(data)})
//         }
//       });
//     }
//   })
//
// })
