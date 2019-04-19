//  __   __  ___        ___
// |__) /  \  |  |__/ |  |  
// |__) \__/  |  |  \ |  |  

// This is the main file for the <%= name %> bot.

// Import Botkit's core features
const { Botkit } = require('botkit');

// Import a platform-specific adapter for <%= platform %>.
<% if (platform === 'slack') { %>
const { SlackAdapter, SlackMessageTypeMiddleware, SlackEventMiddleware } = require('botbuilder-adapter-slack');
<% } else if (platform === 'webex') { %>
const { WebexAdapter } = require('botbuilder-adapter-webex');
<% } else if (platform === 'websocket') { %>
const { WebsocketAdapter } = require('botbuilder-adapter-websocket');
<% } else if (platform === 'facebook') { %>
const { FacebookAdapter, FacebookEventTypeMiddleware } = require('botbuilder-adapter-facebook');
<% } else if (platform === 'twilio-sms') { %>const { TwilioAdapter } = require('botbuilder-adapter-twilio-sms');
<% } else if (platform === 'hangouts') { %>const { HangoutsAdapter } = require('botbuilder-adapter-hangouts');<% } %>
const { MongoDbStorage } = require('botbuilder-storage-mongodb');

// Load process.env values from .env file
require('dotenv').config();

let storage = null;
if (process.env.MONGO_URI) {
    storage = mongoStorage = new MongoDbStorage({
        url : process.env.MONGO_URI,
    });
}

<% if (platform === 'slack') { %>

const adapter = new SlackAdapter({
    // parameters used to secure webhook endpoint
    verificationToken: process.env.verificationToken,
    clientSigningSecret: process.env.clientSigningSecret,  

    // auth token for a single-team app
    botToken: process.env.botToken,

    // credentials used to set up oauth for multi-team apps
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    scopes: ['bot'], 
    redirectUri: process.env.redirectUri,
 
    // functions required for retrieving team-specific info
    // for use in multi-team apps
    getTokenForTeam: getTokenForTeam,
    getBotUserByTeam: getBotUserByTeam,
});

// Use SlackEventMiddleware to emit events that match their original Slack event types.
adapter.use(new SlackEventMiddleware());

// Use SlackMessageType middleware to further classify messages as direct_message, direct_mention, or mention
adapter.use(new SlackMessageTypeMiddleware());
<% } else if (platform === 'webex') { %>
const adapter = new WebexAdapter({
    access_token: process.env.access_token,
    public_address: process.env.public_address
})    
<% } else if (platform === 'websocket') { %>
const adapter = new WebsocketAdapter({});
<% } else if (platform === 'facebook') { %>
const adapter = new FacebookAdapter({
    verify_token: process.env.FACEBOOK_VERIFY_TOKEN,
    access_token: process.env.FACEBOOK_ACCESS_TOKEN,
    app_secret: process.env.FACEBOOK_APP_SECRET,
})

// emit events based on the type of facebook event being received
adapter.use(new FacebookEventTypeMiddleware());
<% } else if (platform === 'twilio-sms') { %>
const adapter = new TwilioAdapter({
    twilio_number: process.env.TWILIO_NUMBER,
    account_sid: process.env.TWILIO_ACCOUNT_SID,
    auth_token: process.env.TWILIO_AUTH_TOKEN,
});
<% } else if (platform === 'hangouts') { %>
const adapter = new HangoutsAdapter({
    token: process.env.GOOGLE_TOKEN,
    google_auth_params: {
        credentials: JSON.parse(process.env['GOOGLE_CREDS'])
    }
});
<% } else { %>

<% } %>

const controller = new Botkit({
    debug: true,
    webhook_uri: '/api/messages',
<% if (platform === 'botframework') { %>
    adapterConfig: {
        appId: process.env.APP_ID,
        appPassword: process.env.APP_PASSWORD,
    },
<% } else { %>
    adapter: adapter,
<% } %>
    cms: {
        cms_uri: process.env.cms_uri,
        token: process.env.cms_token,
    },
    storage
});


// Once the bot has booted up its internal services, you can use them to do stuff.
controller.ready(() => {

    // load traditional developer-created local custom feature modules
    controller.loadModules(__dirname + '/features');

    /* catch-all that uses the CMS to trigger dialogs */
    if (controller.cms) {
        controller.on('message,direct_message', async (bot, message) => {
            let results = false;
            results = await controller.cms.testTrigger(bot, message);

            if (results !== false) {
                // do not continue middleware!
                return false;
            }
        });
    }

});

<% if (platform === 'slack') { %>

let tokenCache = {};
let userCache = {};

if (process.env.TOKENS) {
    tokenCache = JSON.parse(process.env.TOKENS);
} 

if (process.env.USERS) {
    userCache = JSON.parse(process.env.USERS);
} 

async function getTokenForTeam(teamId) {
    if (tokenCache[teamId]) {
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(tokenCache[teamId]);
            }, 150);
        });
    } else {
        console.error('Team not found in tokenCache: ', teamId);
    }
}

async function getBotUserByTeam(teamId) {
    if (userCache[teamId]) {
        return new Promise((resolve) => {
            setTimeout(function() {
                resolve(userCache[teamId]);
            }, 150);
        });
    } else {
        console.error('Team not found in userCache: ', teamId);
    }
}
<% } %>