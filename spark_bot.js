/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Facebook bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Facebook's Messenger APIs
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

var Botkit = require('./lib/Botkit.js');

var controller = Botkit.sparkbot({
    debug: true,
    log: true,
    public_address: process.env.public_address,
    ciscospark_access_token: process.env.access_token
});

var bot = controller.spawn({
});

controller.setupWebserver(process.env.PORT || 3000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log("SPARK: Webhooks set up!");
    });
});

controller.hears(['^markdown'], 'direct_message,direct_mention', function(bot, message) {

    bot.reply(message, {text: '*this is cool*', markdown: '*this is super cool*'});

});

controller.on('user_room_join', function(bot, message) {
    bot.reply(message, 'Welcome, ' + message.original_message.data.personDisplayName);
});

controller.on('user_room_leave', function(bot, message) {
    bot.reply(message, 'Bye, ' + message.original_message.data.personDisplayName);
});


controller.on('bot_room_join', function(bot, message) {

    bot.reply(message, 'This trusty bot is here to help.');

});

controller.on('direct_mention', function(bot, message) {
    bot.reply(message, 'You mentioned me.');
});

controller.on('direct_message', function(bot, message) {
    bot.reply(message, 'I got your private message.');
});
