const { Botkit } = require('botkit');
const { SlackAdapter, SlackMessageTypeMiddleware,  SlackEventMiddleware } = require('botbuilder-slack');
const { WebexAdapter } = require('botbuilder-webex');

const basicAuth = require('express-basic-auth');


/* ----------------------------------------------------------------------
 * .-.   .-.      .-.
 * : :.-.: :      : :
 * : :: :: : .--. : `-.  .--. .-.,-.
 * : `' `' ;' '_.'' .; :' '_.'`.  .'
 *  `.,`.,' `.__.'`.__.'`.__.':_,._;
 * Configure the Webex Teams adapter
 * ----------------------------------------------------------------------
 */
// const adapter = new WebexAdapter({
//     access_token: process.env.access_token,
//     public_address: process.env.public_address
// })



/* ----------------------------------------------------------------------
 *  .--. .-.               .-.
 * : .--': :               : :.-.
 * `. `. : :   .--.   .--. : `'.'
 * _`, :: :_ ' .; ; '  ..': . `.
 * `.__.'`.__;`.__,_;`.__.':_;:_;
 * Configure the Slack adapter
 * ----------------------------------------------------------------------
 */
// const adapter = new SlackAdapter({
//     verificationToken: process.env.verificationToken,
//     botToken: process.env.botToken,
// });


// // Use SlackEventMiddleware to modify incoming Activity objects so they have .type fields that match their original Slack event types.
// // this may BREAK waterfall dailogs which only accept ActivityTypes.Message
// adapter.use(new SlackEventMiddleware());

// Use SlackMessageType middleware to furhter classify messages as direct_message, direct_mention, or mention
// this will BREAK waterfall dailogs which only accept ActivityTypes.Message
// adapter.use(new SlackMessageTypeMiddleware());


const controller = new Botkit({
    debug: true,
    webhook_uri: '/api/messages',
    // adapter: adapter,
    authFunction:  basicAuth({
        users: { 'admin': 'supersecret' }, // TODO: externalize these
        challenge: true,
    }),
    cms: {
        cms_uri: process.env.cms_uri,
        token: process.env.cms_token,
    }
});


// Once the bot has booted up its internal services, you can use them to do stuff.
controller.ready(() => {

    // load traditional developer-created local custom feature modules
    controller.loadModules(__dirname + '/features');

    // load "packaged" plugins
    // turn on verbose console logging of send/receive/web requests
    controller.plugins.use(require('./plugins/verbose/index.js'));

    // turn on /admin route
    controller.plugins.use(require('./plugins/admin/index.js'));

    // turn on the /sample route
    controller.plugins.use(require('./plugins/sample/sample.js'));

    /* catch-all that uses the CMS to trigger dialogs */
    // controller.on('message', async (bot, message) => {
    if (controller.cms) {
        controller.middleware.receive.use(async (bot, message, next) => {
            if (message.type === 'message') {
                let results = await controller.cms.testTrigger(bot, message);
            }

            next();
        });
    }

});
