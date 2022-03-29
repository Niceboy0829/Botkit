var Bot = require('./Bot.js');
var request = require('request');
var ws = require('ws');
var fs = require('fs');
var express = require('express'),
    bodyParser = require("body-parser");


function Slackbot(configuration) {

  var bot = Bot(configuration);

  bot.connections = [];

  bot.api = {
      api_url: 'https://slack.com/api/',
      // this is a simple function used to call the slack web API
      callAPI: function(command,options,cb) {
        options.token = configuration.token;
        bot.debug(command,options);
        request.post(this.api_url+command,function (error, response, body) {
         bot.debug('Got response',error,body);
         if (!error && response.statusCode == 200) {
           var json = JSON.parse(body);
           if (json.ok) {
             if (cb) cb(null,json);
           } else {
             if (cb) cb(json.error,json);
           }
         } else {
           if (cb) cb(error);
         }
        }).form(options);
      },
      callAPIWithoutToken: function(command,options,cb) {
        bot.debug(command,options);
        request.post(this.api_url+command,function (error, response, body) {
         bot.debug('Got response',error,body);
         if (!error && response.statusCode == 200) {
           var json = JSON.parse(body);
           if (json.ok) {
             if (cb) cb(null,json);
           } else {
             if (cb) cb(json.error,json);
           }
         } else {
           if (cb) cb(error);
         }
        }).form(options);
      },
      webhooks: {
        send: function(options,cb) {
          if (!configuration.incoming_webhook) {
            bot.debug('CANNOT SEND WEBHOOK!!');
            if (cb) cb('No webhook url specified');
          } else {
            request.post(configuration.incoming_webhook.url,function(err,res,body) {
                if (err) {
                  bot.debug('WEBHOOK ERROR',err);
                  if (cb) cb(err);
                } else {
                  bot.debug('WEBHOOK SUCCESS',body);
                  if (cb) cb(null,body);
                }
            }).form(JSON.stringify(options));
          }
        }
      },
      auth: {
          test: function(options,cb) {
            bot.api.callAPI('auth.test',options,cb);
          }
      },
      oauth: {
          access: function(options,cb) {
            bot.api.callAPIWithoutToken('oauth.access',options,cb);
          }
      },
      channels: {
        archive: function(options,cb) {
          bot.api.callAPI('channels.archive',options,cb);
        },
        create: function(options,cb) {
          bot.api.callAPI('channels.create',options,cb);
        },
        history: function(options,cb) {
          bot.api.callAPI('channels.history',options,cb);
        },
        info: function(options,cb) {
          bot.api.callAPI('channels.info',options,cb);
        },
        invite: function(options,cb) {
          bot.api.callAPI('channels.invite',options,cb);
        },
        join: function(options,cb) {
          bot.api.callAPI('channels.join',options,cb);
        },
        kick: function(options,cb) {
          bot.api.callAPI('channels.kick',options,cb);
        },
        leave: function(options,cb) {
          bot.api.callAPI('channels.leave',options,cb);
        },
        list: function(options,cb) {
          bot.api.callAPI('channels.list',options,cb);
        },
        mark: function(options,cb) {
          bot.api.callAPI('channels.mark',options,cb);
        },
        rename: function(options,cb) {
          bot.api.callAPI('channels.rename',options,cb);
        },
        setPurpose: function(options,cb) {
          bot.api.callAPI('channels.setPurpose',options,cb);
        },
        setTopic: function(options,cb) {
          bot.api.callAPI('channels.setTopic',options,cb);
        },
        unarchive: function(options,cb) {
          bot.api.callAPI('channels.unarchive',options,cb);
        }
      },
      chat: {
        delete: function(options,cb) {
          bot.api.callAPI('chat.delete',options,cb);
        },
        postMessage: function(options,cb) {
          bot.api.callAPI('chat.postMessage',options,cb);
        },
        update: function(options,cb) {
          bot.api.callAPI('chat.update',options,cb);
        }
      },
      emoji: {
        list: function(options,cb) {
          bot.api.callAPI('emoji.list',options,cb);
        }
      },
      files: {
        delete: function(options,cb) {
          bot.api.callAPI('files.delete',options,cb);
        },
        info: function(options,cb) {
          bot.api.callAPI('files.info',options,cb);
        },
        list: function(options,cb) {
          bot.api.callAPI('files.list',options,cb);
        },
        upload: function(options,cb) {
          bot.api.callAPI('files.upload',options,cb);
        },
      },
      groups: {
        archive: function(options,cb) {
          bot.api.callAPI('groups.archive',options,cb);
        },
        close: function(options,cb) {
          bot.api.callAPI('groups.close',options,cb);
        },
        create: function(options,cb) {
          bot.api.callAPI('groups.create',options,cb);
        },
        createChild: function(options,cb) {
          bot.api.callAPI('groups.createChild',options,cb);
        },
        history: function(options,cb) {
          bot.api.callAPI('groups.history',options,cb);
        },
        info: function(options,cb) {
          bot.api.callAPI('groups.info',options,cb);
        },
        invite: function(options,cb) {
          bot.api.callAPI('groups.invite',options,cb);
        },
        kick: function(options,cb) {
          bot.api.callAPI('groups.kick',options,cb);
        },
        leave: function(options,cb) {
          bot.api.callAPI('groups.leave',options,cb);
        },
        list: function(options,cb) {
          bot.api.callAPI('groups.list',options,cb);
        },
        mark: function(options,cb) {
          bot.api.callAPI('groups.mark',options,cb);
        },
        open: function(options,cb) {
          bot.api.callAPI('groups.open',options,cb);
        },
        rename: function(options,cb) {
          bot.api.callAPI('groups.rename',options,cb);
        },
        setPurpose: function(options,cb) {
          bot.api.callAPI('groups.setPurpose',options,cb);
        },
        setTopic: function(options,cb) {
          bot.api.callAPI('groups.setTopic',options,cb);
        },
        unarchive: function(options,cb) {
          bot.api.callAPI('groups.unarchive',options,cb);
        },
      },
      im: {
        close: function(options,cb) {
          bot.api.callAPI('im.close',options,cb);
        },
        history: function(options,cb) {
          bot.api.callAPI('im.history',options,cb);
        },
        list: function(options,cb) {
          bot.api.callAPI('im.list',options,cb);
        },
        mark: function(options,cb) {
          bot.api.callAPI('im.mark',options,cb);
        },
        open: function(options,cb) {
          bot.api.callAPI('im.open',options,cb);
        }
      },
      reactions: {
        add: function(options,cb) {
          bot.api.callAPI('reactions.add',options,cb);
        },
        get: function(options,cb) {
          bot.api.callAPI('reactions.get',options,cb);
        },
        list: function(options,cb) {
          bot.api.callAPI('reactions.list',options,cb);
        },
        remove: function(options,cb) {
          bot.api.callAPI('reactions.remove',options,cb);
        },
      },
      rtm: {
        start: function(options,cb) {
          bot.api.callAPI('rtm.start',options,cb);
        },
      },
      search: {
        all: function(options,cb) {
          bot.api.callAPI('search.all',options,cb);
        },
        files: function(options,cb) {
          bot.api.callAPI('search.files',options,cb);
        },
        messages: function(options,cb) {
          bot.api.callAPI('search.messages',options,cb);
        },
      },
      stars: {
        list: function(options,cb) {
          bot.api.callAPI('stars.list',options,cb);
        },
      },
      team: {
        accessLogs: function(options,cb) {
          bot.api.callAPI('team.accessLogs',options,cb);
        },
        info: function(options,cb) {
          bot.api.callAPI('team.info',options,cb);
        },
      },
      users: {
        getPresence: function(options,cb) {
          bot.api.callAPI('users.getPresence',options,cb);
        },
        info: function(options,cb) {
          bot.api.callAPI('users.info',options,cb);
        },
        list: function(options,cb) {
          bot.api.callAPI('users.list',options,cb);
        },
        setActive: function(options,cb) {
          bot.api.callAPI('users.setActive',options,cb);
        },
        setPresence: function(options,cb) {
          bot.api.callAPI('users.setPresence',options,cb);
        },
      }
  }

  // set up a web route that is a landing page
  bot.createHomepageEndpoint = function(webserver) {

    webserver.get('/',function(req,res) {

      res.send('Howdy!');

    });

  }


  // set up a web route for receiving outgoing webhooks and/or slash commands
  bot.createWebhookEndpoints = function(webserver) {

    webserver.post('/slack/receive',function(req,res) {

      // this is a slash command
      if (req.body.command) {
        var message = {};

        for (var key in req.body) {
          message[key] = req.body[key];
        }

        // let's normalize some of these fields to match the rtm message format

        message.user = message.user_id;
        message.channel = message.channel_id;


        bot.findTeamById(message.team_id,function(err,connection) {

          if (err) {

          } else {
            message.type='slash_command';

            res.status(200);
            connection.res = res;
            bot.trigger('slash_command',[connection,message]);
//            bot.receiveMessage(connection,message);

            // HEY THERE
            // Slash commands can actually just send back a response
            // and have it displayed privately.  This is different than that!
            // maybe we need a custom event.

            //res.send('');
          }
        });

      } else if (req.body.trigger_word) {

        var message = {};

        for (var key in req.body) {
          message[key] = req.body[key];
        }

/*  { token: 'Y07ff2RCykfHziqOqOS0oaqx',
    team_id: 'T024F7C87',
    team_domain: 'xoxco',
    service_id: '10023171315',
    channel_id: 'C0672HQUX',
    channel_name: 'gruntforce',
    timestamp: '1441485139.000219',
    user_id: 'U024F7C89',
    user_name: 'benbrown',
    text: 'botkit hello',
    trigger_word: 'botkit',
    type: 'outgoing_webhook' }
    */

        // let's normalize some of these fields to match the rtm message format

        message.user = message.user_id;
        message.channel = message.channel_id;


        bot.findTeamById(message.team_id,function(err,connection) {

          if (err) {

          } else {
            message.type='outgoing_webhook';
            connection.res = res;
            res.status(200);
            bot.trigger('outgoing_webhook',[connection,message]);

            // bot.receiveMessage(connection,message);

            // outgoing webhooks are also different. They can simply return
            // a response instead of using the API to reply.  Maybe this is
            // a different type of event!!

            res.send('');
          }
        });

      }

    })
  }

  bot.findTeamById = function(id,cb) {

    // look up a team's memory and configuration and return it, or
    // return an error!
    if (!bot.config.path) {
      cb('Not configured to store team info');
    } else {
      if (fs.existsSync(bot.config.path+'/' + id + '.json')) {
        json = fs.readFileSync(bot.config.path+'/' + id + '.json','utf8');
        json = JSON.parse(json);
        cb(null,{team: json});
      } else {
        cb('Not found');
      }
    }

  }


  bot.setupWebserver = function(cb) {

    bot.webserver = express();
    bot.webserver.use(bodyParser.json());
    bot.webserver.use(bodyParser.urlencoded({ extended: true }));
    bot.webserver.use(express.static(__dirname + '/public'));

    var server = bot.webserver.listen(configuration.port, function () {
      console.log('listening on port ' + configuration.port);
      cb(null,bot.webserver);
    });

  }


  // set up a web route for redirecting users
  // and collecting authentication details
  // https://api.slack.com/docs/oauth
  bot.createOauthEndpoints = function(webserver) {

    webserver.get('/login',function(req,res) {

        var url = 'https://slack.com/oauth/authorize';


        res.redirect(url + "?client_id=" + configuration.clientId + "&scope=incoming-webhook&state=botkit")

    });

    webserver.get('/oauth',function(req,res) {

      var code = req.query.code;
      var state = req.query.state;

      bot.api.oauth.access({
        client_id: configuration.clientId,
        client_secret: configuration.clientSecret,
        code: code
      },function(err,auth) {

        if (err) {
          res.send(err);
        } else {
          res.send('ok! sending test');

          console.log(auth);

          // temporarily use the token we got from the oauth
          configuration.token = auth.access_token;
          bot.api.auth.test({},function(err,identity) {

            console.log(identity);

            bot.findTeamById(identity.team_id,function(err,connection) {

              auth.incoming_webhook.token = auth.access_token;
              if (!connection) {
                connection = {
                  team: {
                    incoming_webhook: auth.incoming_webhook,
                    id: identity.team_id,
                    createdBy: identity.user_id,
                    team_url: identity.url,
                    team_name: identity.team,
                  }
                }
                bot.trigger('create_team',[connection]);
              } else {
                connection.team.incoming_webhook = auth.incoming_webhook;
                bot.trigger('update_team',[connection]);
              }
              bot.trigger('create_incoming_webhook',[connection]);

              bot.saveTeam(connection);
              bot.useConnection(connection);
              bot.api.webhooks.send({
                text: 'This is a test incoming webhook configured by oauth!',
              });
            });

          })

        }

      });

    });


  }

  bot.saveTeam = function(connection) {

    if (bot.config.path) {
      var json = JSON.stringify(connection.team);
      json = fs.writeFileSync(bot.config.path+'/' + connection.team.id + '.json',json,'utf8');
    }

  }

  bot.useConnection = function(connection) {
    configuration.token = connection.team.token;
    configuration.incoming_webhook = connection.team.incoming_webhook;
  }

  bot.say = function(connection,message,cb) {
    bot.debug('SAY ',message);
    bot.useConnection(connection);
    bot.api.chat.postMessage({
      as_user: true,
      channel: message.channel,
      text: message.text,
    },function(err,res) {
      if (err) {
        bot.debug('SLACK ERROR: ',err);
        if (typeof(cb)=='function') cb(err);
      } else {
        bot.log('SAY SUCCESS',res);
        if (typeof(cb)=='function') cb(null,res);
      }
    });
    // bot.rtm.sendMessage(message.channel,message.text);
  }

  bot.reply = function(connection,src,resp,cb) {
    bot.say(connection,{
      channel: src.channel,
      text: resp
    },cb);
  }

  bot.findConversation = function(message,cb) {
    bot.debug('CUSTOM FIND CONVO',message.user,message.channel);

    if (message.type=='message') {
      for (var t = 0; t < bot.tasks.length; t++) {
        for (var c = 0; c < bot.tasks[t].convos.length; c++) {
          if (
            bot.tasks[t].convos[c].isActive()
            && bot.tasks[t].convos[c].source_message.user==message.user
            && bot.tasks[t].convos[c].source_message.channel==message.channel
          ) {
            bot.debug('FOUND EXISTING CONVO!');
            cb(bot.tasks[t].convos[c]);
            return;
          }
        }
      }
    }
    cb(null);

  }

  bot.startRTM = function(connection) {

    bot.useConnection(connection);
    bot.api.rtm.start({},function(err,res) {

      bot.identity = res.self;
//      bot.team = res.team;

      // also available
      // res.users
      // res.channels
      // res.groups
      // res.ims
      // res.bots
      // these could be stored and cached for later use?

          bot.debug(":::::::> I AM ", bot.identity.name);

           connection.rtm = new ws(res.url);
           connection.rtm.on('message', function(data, flags) {

             var message = JSON.parse(data);
              bot.receiveMessage(connection,message);
           });
     });
  }

  bot.on('ready',function() {

    bot.debug(":::::::> Slackbot booting");


      bot.on('message_received',function(connection,message) {
        bot.debug('DEFAULT SLACK MSG RECEIVED RESPONDER');
        console.log(message);
        console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
        if ('message' == message.type) {

          // set up a couple of special cases based on subtype


          if (message.subtype && message.subtype=='channel_join') {
            // someone joined. maybe do something?
            if (message.user==bot.identity.id) {
              bot.trigger('bot_channel_join',[connection,message]);
              return false;
            } else {
              bot.trigger('user_channel_join',[connection,message]);
              return false;
            }
          } else if (message.subtype && message.subtype == 'group_join') {
            // someone joined. maybe do something?
            if (message.user==bot.identity.id) {
              bot.trigger('bot_group_join',[connection,message]);
              return false;
            } else {
              bot.trigger('user_group_join',[connection,message]);
              return false;
            }

          } else if (message.subtype) {
            bot.trigger(message.subtype,[connection,message]);
            return false;

          } else if (message.channel.match(/^D/)){
            // this is a direct message
            if (message.user==bot.identity.id) {
              return false;
            }

            if (!message.text) {
              // message without text is probably an edit
              return false;
            }

            // remove direct mention so the handler doesn't have to deal with it
            var direct_mention = new RegExp('^\<\@' + bot.identity.id + '\>','i');
            message.text = message.text.replace(direct_mention,'').replace(/^\s+/,'').replace(/^\:/,'').replace(/^\s+/,'');

            message.event = 'direct_message';

            bot.trigger('direct_message',[connection,message]);
            return false;

          } else {
            if (message.user==bot.identity.id) {
              return false;
            }
            if (!message.text) {
              // message without text is probably an edit
              return false;
            }

            var direct_mention = new RegExp('^\<\@' + bot.identity.id + '\>','i');
            var mention = new RegExp('\<\@' + bot.identity.id + '\>','i');

            if (message.text.match(direct_mention)) {
              // this is a direct mention
              message.text = message.text.replace(direct_mention,'').replace(/^\s+/,'').replace(/^\:/,'').replace(/^\s+/,'');
              message.event = 'direct_mention';

              bot.trigger('direct_mention',[connection,message]);
              return false;
            } else if (message.text.match(mention)) {
              message.event = 'mention';

              bot.trigger('mention',[connection,message]);
              return false;
            } else {
              message.event = 'ambient';
              bot.trigger('ambient',[connection,message]);
              return false;

            }
          }
        }
      });

  });

  return bot;
}

module.exports = Slackbot;
