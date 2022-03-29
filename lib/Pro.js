var _BOTKIT_SCRIPT_API = 'http://192.168.33.13:3000';
var _BOTKIT_LOGIN_API = 'http://192.168.33.17:3000';
// var _BOTKIT_COMMAND_API = 'http://ren:stimpy@happynetbox.com'
var _BOTKIT_COMMAND_API = 'http://192.168.33.11:3000';

var request = require('request');
var Promise = require('promise');

module.exports = function(botkit) {
    //
    // botkit.middleware.spawn.use(function(bot, next) {
    //
    //     botkit.loginToHowdy(bot,{
    //         username: bot.config.howdy_key,
    //         password: bot.config.howdy_secret,
    //     }).then(function(session) {
    //
    //         console.log('GOT A SESSION', session);
    //         bot.howdy_session = session;
    //
    //     }).catch(function(err) {
    //         console.log('ERROR LOGGING IN ', err);
    //         throw new Error(err);
    //     });
    // });

    var before_hooks = {};
    var after_hooks = {};

    function howdyAPI(bot,options) {
        return new Promise(function(resolve,reject) {

            var headers = {
                'content-type': 'application/json',
            };

            console.log('Making an API call to ',options.uri);

            if (bot.config.howdy_token) {
                console.log('Using authenticated session');
                options.uri = options.uri + '?access_token=' + bot.config.howdy_token;
                //    options.headers.session = JSON.stringify(howdy_session);
            } else if (botkit.config.howdy_token) {
                console.log('Using shared authenticated session');
                options.uri = options.uri + '?access_token=' + botkit.config.howdy_token;
            }

            options.headers = headers;

            request(options, function(err,res,body) {

                console.log('Received results:');

                if (err) {
                    console.log('Rejecting because of error!',err);
                    return reject(err);
                }
                console.log('/////////////////////////////////////////////////')
                console.log(body);

                json = JSON.parse(body);
                if (json) {
                    if (json.error) {
                        console.log('Rejecting because JSON error', json.error);
                        reject(json.error);
                    } else {
                        console.log('Accepting!', json);
                        resolve(json);
                    }
                } else {
                    return reject('Invalid JSON');
                }
            });
        });

    }

    // botkit.loginToHowdy = function(bot, options) {
    //
    //     console.log('getting session...');
    //
    //     var url = _BOTKIT_LOGIN_API + '/api/v1/users/login';
    //     return howdyAPI(bot, {
    //         uri: url,
    //         body: JSON.stringify(options),
    //         method: 'POST',
    //     });
    // };
    //

    // load a script from the pro service
    botkit.loadScriptFromPro = function(bot,script_id) {

        var url = _BOTKIT_COMMAND_API + '/api/v1/script/' + script_id;
        console.log(url);
        return howdyAPI(bot, {
            uri: url,
        });
    };


    // load a script from the pro service
    botkit.remoteTrigger = function(bot,text) {

        var url = _BOTKIT_COMMAND_API + '/api/v1/commands/triggers';
        // console.log(url);
        return howdyAPI(bot, {
            uri: url,
            method: 'post',
            form: {triggers: text},
        });
    };


    botkit.compileScript = function(bot, message, topics, vars) {
      // console.log('..............................................................................................................');
      // console.log(bot);
      console.log('..............................................................................................................');
      console.log(message);
      console.log('..............................................................................................................');
      console.log(topics);
      if(vars){
        console.log('..............................................................................................................');
        console.log(vars);
        console.log('..............................................................................................................');
      }
        function makeHandler(options) {
            return {
                pattern: options.pattern,
                default: options.default,
                callback: function(response, convo) {
                    switch (options.action) {
                            case 'next':
                                convo.next();
                                break;
                            case 'repeat':
                                convo.repeat();
                                convo.next();
                                break;
                            case 'stop':
                                convo.stop();
                                break;
                            default:
                                convo.changeTopic(options.action);
                                break;
                    }
                }
            };

        }

        return new Promise(function(resolve,reject) {
            bot.createConversation(message, function(err, convo) {
                if (err) { return reject(err); }

            //    parseScript(script_raw).then(function(topics) {
                    for (var t=0; t < topics.length; t++) {
                        var topic = topics[t].topic;
                        for (var m = 0; m < topics[t].script.length; m++) {
                            // is this a question?
                            //topics[t].script[m].delay = 3000;

                            var message = {
                            };

                            if (topics[t].script[m].text) {
                                message.text = topics[t].script[m].text;
                            }
                            if (topics[t].script[m].attachments) {
                                message.attachments = topics[t].script[m].attachments;
                            }

                            if (topics[t].script[m].action) {
                                message.action = topics[t].script[m].action;
                            }

                            if (topics[t].script[m].collect) {
                                // this is a question message
                                var capture_options = {};
                                var handlers = [];
                                var options = topics[t].script[m].collect.options || [];
                                if (topics[t].script[m].collect.key) {
                                    capture_options.key = topics[t].script[m].collect.key;
                                }
                                var default_found = false;
                                for (var o = 0; o < options.length; o++) {
                                    var handler = makeHandler(options[o]);
                                    handlers.push(handler);
                                    if (options[o].default) {
                                        default_found = true;
                                    }
                                }

                                // make sure there is a default
                                if (!default_found) {
                                    handlers.push({
                                        default: true,
                                        callback: function(r,c) { c.next(); }
                                    });
                                }

                                convo.addQuestion(message,handlers,capture_options,topic);

                            } else {

                                console.log('ADDING A MESSAGE', message);
                                // this is a simple message
                                convo.addMessage(message,topic);
                            }
                        }
                    }
                // }).catch(function(err) {
                //     convo.say('Error parsing script: ' + err);
                // });

                resolve(convo);
            });
        });
    };



    botkit.before = function(command_name, func) {

        if (!before_hooks[command_name]) {
            before_hooks[command_name] = [];
        }

        before_hooks[command_name].push(func);

        return botkit;
    }


    botkit.after = function(command_name, func) {

        if (!after_hooks[command_name]) {
            after_hooks[command_name] = [];
        }

        after_hooks[command_name].push(func);

        return botkit;

    }

    botkit.runHooks = function(hooks, convo, cb) {

        console.log('_-------------------------------------');
        console.log(hooks);
        console.log('_-------------------------------------');

        if (!hooks || !hooks.length) {
            return cb(convo);
        }

        var func = hooks.shift();

        func(convo, function() {
            if (hooks.length) {
                botkit.runHooks(hooks, convo, cb);
            } else {
                return cb(convo);
            }
        });
    }


    // tear this into smaller pieces
    botkit.triggerConversation = function(bot, message) {
        console.log('triggering...');
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
        return new Promise(function(resolve,reject) {
            botkit.remoteTrigger(bot, message.text).then(function(command) {
                if (command !== {} && command.id) {
                  console.log('--------------------------------------------------------------------------------------------------');
                  console.log(command);
                  console.log('--------------------------------------------------------------------------------------------------');
                  botkit.trigger('remote_command', [bot, message, command]);
                  botkit.trigger('command_triggered', [bot, message, command]);
                  console.log('=============================================================================================================');
                    botkit.compileScript(bot, message, command.script, command.variables).then(function(convo) {

                        console.log('zzzzzzzzzzzzzzzzzzzzzzzzz');
                        console.log(JSON.stringify(command.script));

                        console.log('zzzzzzzzzzzzzzzzzzzzzzzzz');
                        console.log('zzzzzzzzzzzzzzzzzzzzzzzzz');
                        console.log('zzzzzzzzzzzzzzzzzzzzzzzzz');

                        convo.on('end', function(convo) {
                            botkit.runHooks(after_hooks[command.command]?after_hooks[command.command].slice():[], convo, function(convo) {
                                botkit.trigger('remote_command_end', [bot, message, command, convo]);
                                resolve(convo);
                            });
                        });

                        botkit.runHooks(before_hooks[command.command]?before_hooks[command.command].slice():[], convo, function(convo) {
                            convo.activate();
                        });
                    }).catch(function(err) {
                        reject(err);
                    });
                } else {
                    // do nothing
                }
            }).catch(function(err) {
                reject(err);
            });
        });

    };

};
