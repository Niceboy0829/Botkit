/**
 * @module botkit
 */
import { BotFrameworkAdapter, MemoryStorage,  Storage, ConversationReference, TurnContext } from 'botbuilder';
import { DialogContext, DialogSet, DialogTurnStatus } from 'botbuilder-dialogs';
import { BotkitCMSHelper } from './cms';
import { BotkitPluginLoader } from './plugin_loader';
import { BotWorker } from './botworker';
import { BotkitConversationState } from './conversationState';
import * as path from 'path';
import * as http from 'http';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as hbs from 'hbs';

import * as ware from 'ware';
import * as fs from 'fs';

const debug = require('debug')('botkit');

/**
 * Configuration options used when instantiating Botkit to create the main app controller.
 */
export interface BotkitConfiguration {
    /**
     * Path used to create incoming webhook URI.  Defaults to /api/messages
     */
    webhook_uri?: string;

    /**
     * A fully configured BotBuilder Adapter, such as `botbuilder-adapter-slack` or `botbuilder-adapter-websocket`
     * The adapter is responsible for translating platform-specific messages into the format understood by Botkit and BotBuilder
     */
    adapter?: BotFrameworkAdapter;

    /**
     * If using the BotFramework service, options included in `adapterConfig` will be passed to the new Adapter when created internally.
     * See [BotFrameworkAdapterSettings](https://docs.microsoft.com/en-us/javascript/api/botbuilder/botframeworkadaptersettings?view=azure-node-latest&viewFallbackFrom=botbuilder-ts-latest).
     */
    adapterConfig?: {[key: string]: any}; // object with stuff in it

    /**
     * A configuration passed to the Botkit CMS helper.
     */
    cms?: {[key: string]: any};

    /**
     * An instance of Express used to define web endpoints.  If not specified, oen will be created internally.
     * Note: only use your own Express if you absolutely must for some reason. Otherwise, use `controller.webserver`
     */
    webserver?: any;

    /**
     * A Storage interface compatible with [this specification](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/storage?view=botbuilder-ts-latest)
     * Defaults to the ephemeral [MemoryStorage](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/memorystorage?view=botbuilder-ts-latest) implementation.
     */
    storage?: Storage;

    /**
     * An Express middleware function used to authenticate requests to the /admin URI of your Botkit application.
     */
    authFunction?: (req, res, next) => void; 
}

export interface BotkitMessage {
    type: string;
    text?: string;
    user: string;
    channel: string;
    reference: ConversationReference;
    incoming_message: {[key: string]: any};
    [key: string]: any; // allow any other fields to live alongside the defined fields.
}

export interface BotkitHandler {
    (bot: BotWorker, message: BotkitMessage): Promise<any>;
}

export interface BotkitTrigger {
    type: string;
    pattern: string | RegExp | { (message: BotkitMessage):  Promise<boolean> };
    handler: BotkitHandler;
}

/**
 * Create a new instance of Botkit to define the controller for a conversational app.
 * To connect Botkit to a chat platform, pass in a fully configured `adapter`.
 * If one is not specified, Botkit will expose an adapter for the Microsoft Bot Framework.
 */
export class Botkit {

    /** 
     * _config contains the options passed to the constructor.
     * this property should never be accessed directly - use `getConfig()` instead.
     */
    private _config: BotkitConfiguration;

    /**
     * _events contains the list of all events for which Botkit has registered handlers.
     * Each key in this object points to an array of handler functions bound to that event.
     */
    private _events: {
        [key: string]: BotkitHandler[];
    } = {};

    /**
     * _triggers contains a list of trigger patterns htat Botkit will watch for.
     * Each key in this object points to an array of patterns and their associated handlers.
     * Each key represents an event type.
     */
    private _triggers: {
        [key: string]: BotkitTrigger[];
    } = {};

    /**
     * _interrupts contains a list of trigger patterns htat Botkit will watch for and fire BEFORE firing any normal triggers.
     * Each key in this object points to an array of patterns and their associated handlers.
     * Each key represents an event type.
     */
    private _interrupts: {
        [key: string]: BotkitTrigger[];
    } = {};

    /**
     * conversationState is used to track and persist the state of any ongoing conversations.
     * See https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-howto-v4-state?view=azure-bot-service-4.0&tabs=javascript
     */
    private conversationState: BotkitConversationState;

    /**
     * _deps contains a list of all dependencies that Botkit must load before being ready to operate.
     * see addDep(), completeDep() and ready()
     */
    private _deps: {};

    /**
     * contains an array of functions that will fire when Botkit has completely booted.
     */
    private _bootCompleteHandlers: { (): void }[];

 
    /**
     * The current version of Botkit Core
     */
    public version: string = require('../package.json').version;

    /**
     * Middleware endpoints available for plugins and features to extend Botkit.
     * Endpoints available are: spawn, ingest, receive, send.
     * 
     * To bind a middleware function to Botkit:
     * ```javascript
     * controller.middleware.receive.use(function(bot, message, next) {
     *  
     *  // do something with bot or message
     * 
     *  // always call next, or your bot will freeze!
     *  next();
     * });
     * ```
     */
    public middleware = {
        spawn: new ware(),
        ingest: new ware(),
        send: new ware(),
        receive: new ware(),
    }

    /**
     * a BotBuilder storage driver - defaults to MemoryStorage
     */
    public storage: Storage;

    /**
     * An Express webserver
     */
    public webserver: any;

    /**
     * A direct reference to the underlying HTTP server object
     */
    public http: any;

    /**
     * A BotBuilder-compatible adapter - defaults to a Bot Framework adapter
     */
    public adapter: any; // TODO: this should be BotAdapter, but missing adapter.processActivity causes errors

    /**
     * A BotBuilder DialogSet that serves as the top level dialog container for the Botkit app
     */
    public dialogSet: DialogSet;

    /**
     * Provides an interface to interact with external Botkit plugins
     */
    public plugins: BotkitPluginLoader;

    /**
     * provides an interface to interact with an instance of Botkit CMS
     */
    public cms: BotkitCMSHelper; 

    /**
     * The path of the main Botkit SDK, used to generate relative paths
     */
    public PATH: string;

    /**
     * Indicates whether or not Botkit has fully booted.
     */
    private booted: boolean;

    /* 
     * Create a new Botkit instance
     * @param config Configuration for this instance of Botkit
     */
    constructor(config: BotkitConfiguration) {
        
        // Set the path where Botkit's core lib is found.
        this.PATH = __dirname;

        this._config = {
            debug: false,
            webhook_uri: '/botframework/receive',
            ...config
        };

        // The _deps object contains references to dependencies that may take time to load and be ready.
        // new _deps are defined in the constructor.
        // when all _deps are true, the controller.ready function runs and executes all functions in order.
        this._deps = {};
        this._bootCompleteHandlers = [];
        this.booted = false;
        this.addDep('booted');

        debug('Booting Botkit ', this.version);

        if (!this._config.storage) {
            // Set up temporary storage for dialog state.
            this.storage = new MemoryStorage();
            console.warn('** Your bot is using memory storage and will forget everything when it reboots!');
            console.warn('** To preserve dialog state, specify a storage adapter in your Botkit config:');
            console.warn('** const controller = new Botkit({storage: myStorageAdapter});');
        } else {
            this.storage = this._config.storage;
        }

        this.conversationState = new BotkitConversationState(this.storage);

        // TODO: dialogState propertyname should maybe be settable to avoid collision
        const dialogState = this.conversationState.createProperty('dialogState');

        this.dialogSet = new DialogSet(dialogState);

        if (!this._config.webserver) {
            // Create HTTP server
            this.addDep('webserver');

            this.webserver = express(); 

            // capture raw body
            this.webserver.use((req, res, next) => {
                req.rawBody = '';
                req.on('data', function(chunk) {
                    req.rawBody += chunk;
                });
                next();
            });


            this.webserver.use(bodyParser.json());
            this.webserver.use(bodyParser.urlencoded({ extended: true }));

            this.http = http.createServer(this.webserver);


            hbs.registerPartials(this.PATH + '/../views/partials');
            hbs.localsAsTemplateData(this.webserver);
            // hbs.handlebars.registerHelper('raw-helper', function(options) {
            //     return options.fn();
            // });

            // From https://stackoverflow.com/questions/10232574/handlebars-js-parse-object-instead-of-object-object
            hbs.registerHelper('json', function(context) {
                return JSON.stringify(context);
            });

            this.webserver.set('views', this.PATH + '/../views');
            this.webserver.set('view engine', 'hbs');
            this.webserver.use(express.static(__dirname + '/../public'));

            if (this._config.authFunction) {
                // make sure calls to anything in /admin/ is passed through a validation function
                this.webserver.use((req, res, next) => {
                    if (req.url.match(/^\/admin/)) {
                        this._config.authFunction(req, res, next);
                    } else {
                        next();
                    }
                });



            } else {
                console.warn('No authFunction specified! Web routes will be disabled.');
            }

            this.http.listen(process.env.port || process.env.PORT || 3000, () => {
                debug(`Webhook Endpoint online:  ${ this.webserver.url }${ this._config.webhook_uri }`);
                this.completeDep('webserver');
            });
        } else {
            this.webserver = this._config.webserver;
        }

        if (!this._config.adapter) {
            const adapterConfig = {...this._config.adapterConfig};
            debug('Configuring BotFrameworkAdapter:', adapterConfig);
            this.adapter = new BotFrameworkAdapter(adapterConfig);
        } else {
            debug('Using pre-configured adapter.');
            this.adapter = this._config.adapter;
        }

        if (this._config.cms && this._config.cms.cms_uri && this._config.cms.token) {
            this.cms = new BotkitCMSHelper(this, this._config.cms);
        }

        this.configureWebhookEndpoint();

        this.plugins = new BotkitPluginLoader(this);

        // MAGIC: Treat the adapter as a botkit plugin
        // which allows them to be carry their own platform-specific behaviors
        this.plugins.use(this.adapter);

        this.completeDep('booted');
    }

    /**
     * Get a value from the configuration.
     * 
     * For example:
     * ```javascript
     * // get entire config object
     * let config = controller.getConfig();
     * 
     * // get a specific value from the config
     * let webhook_uri = controller.getConfig('webhook_uri');
     * ```
     * 
     * @param {string} key The name of a value stored in the configuration
     * @returns {any} The value stored in the configuration (or null if absent)
     */
    public getConfig(key?: string) {
        if (key) {
            return this._config[key];
        } else {
            return this._config;
        }
    }

    /**
     * (For use by plugins only) - Add a dependency to Botkit's bootup process that must be marked as completed using `completeDep()`.
     * Botkit's `controller.ready()` function will not fire until all dependencies have been marked complete.
     * 
     * For example, a plugin that needs to do an asynchronous task before Botkit proceeds might do:
     * ```javascript
     * controller.addDep('my_async_plugin');
     * somethingAsync().then(function() {
     *  controller.completeDep('my_async_plugin');
     * });
     * ```
     * 
     * @param name {string} The name of the dependency that is being loaded.
     */
    public addDep(name: string) {
        debug(`Waiting for ${ name }`);
        this._deps[name] = false;
    }

    /**
     * (For use by plugins only) - Mark a bootup dependency as loaded and ready to use
     * Botkit's `controller.ready()` function will not fire until all dependencies have been marked complete.

     * @param name {string} The name of the dependency that has completed loading.
     */
    public completeDep(name: string) {
        debug(`${ name } ready`);

        this._deps[name] = true;
        
        for (let key in this._deps) {
            if (this._deps[key] === false) {
                return false;
            }
        }

        // everything is done!
        this.signalBootComplete();

    }

    /**
     * This function gets called when all of the bootup dependencies are completely loaded.
     */
    private signalBootComplete() {
        this.booted = true;
        for (let h = 0; h < this._bootCompleteHandlers.length; h++) {
            let handler = this._bootCompleteHandlers[h];
            handler.call(this);
        }
    }

    /**
     * Use `controller.ready()` to wrap any calls that require components loaded during the bootup process.
     * This will ensure that the calls will not be made until all of the components have successfully been initialized.
     * 
     * For example:
     * ```javascript
     * controller.ready(() => {
     * 
     *   controller.loadModules(__dirname + '/features');
     * 
     * });
     * ```
     * 
     * @param handler {function} A function to run when Botkit is booted and ready to run.
     */
    public ready(handler: () => any) {
        if (this.booted) {
            handler.call(this);
        } else {
            this._bootCompleteHandlers.push(handler);
        }
    }

    /*
     * Set up a web endpoint to receive incoming messages,
     * pass them through a normalization process, and then ingest them for processing.
     */
    private configureWebhookEndpoint(): void {
        this.webserver.post(this._config.webhook_uri, (req, res) => {
            // Allow the Botbuilder middleware to fire.
            // this middleware is responsible for turning the incoming payload into a BotBuilder Activity
            // which we can then use to turn into a BotkitMessage
            this.adapter.processActivity(req, res, this.handleTurn.bind(this)).catch((err) => {
                // todo: expose this as a global error handler?
                console.error('Experienced an error inside the turn handler', err);
                throw err;
            });
        });
    }

    /**
     * Accepts the result of a BotBuilder adapter's `processActivity()` method and processes it into a Botkit-style message and BotWorker instance
     * which is then used to test for triggers and emit events. 
     * NOTE: This method should only be used in custom adapters that receive messages through mechanisms other than the main webhook endpoint (such as those received via websocket, for example)
     * @param turnContext {TurnContext} a TurnContext representing an incoming message, typically created by an adapter's `processActivity()` method.
     */
    public async handleTurn(turnContext: TurnContext): Promise<any> {

        debug('INCOMING ACTIVITY:', turnContext.activity);

        // Create a dialog context
        const dialogContext = await this.dialogSet.createContext(turnContext);

        // Spawn a bot worker with the dialogContext
        const bot = await this.spawn(dialogContext).catch((err) => { throw err; });

        // Turn this turnContext into a Botkit message.
        const message = {
            ...turnContext.activity.channelData, // start with all the fields that were in the original incoming payload. TODO: this is a shallow copy, is that a problem?

            // if Botkit has further classified this message, use that sub-type rather than the Activity type
            type: ( turnContext.activity.channelData && turnContext.activity.channelData.botkitEventType ) ? turnContext.activity.channelData.botkitEventType : turnContext.activity.type,

            // normalize the user, text and channel info
            user: turnContext.activity.from.id,
            text: turnContext.activity.text,
            channel: turnContext.activity.conversation.id,

            // generate a conversation reference, for replies.
            // included so people can easily capture it for resuming
            reference: TurnContext.getConversationReference(turnContext.activity),

            // include the context possible useful. 
            context: turnContext,

            // include the full unmodified record here
            incoming_message: turnContext.activity,
        } as BotkitMessage;

        return new Promise((resolve, reject) => {
            this.middleware.ingest.run(bot, message, async (err, bot, message) => {
                if (err) {
                    reject(err);
                } else {

                    const interrupt_results = await this.listenForInterrupts(bot, message);

                    if (interrupt_results === false) {
                        // Continue dialog if one is present
                        const dialog_results = await dialogContext.continueDialog();
                        if (dialog_results.status === DialogTurnStatus.empty) {
                            await this.ingest(bot, message);
                        }
                    }

                    // make sure changes to the state get persisted after the turn is over.
                    await this.saveState(bot);
                    resolve();
                }
            });
        });

    }

    /**
     * Save the current conversation state pertaining to a given BotWorker's activities.
     * Note: this is normally called internally and is only required when state changes happen outside of the normal processing flow.
     * @param bot {BotWorker} a BotWorker instance created using `controller.spawn()` 
     */
    public async saveState(bot: BotWorker): Promise<void> {
        await this.conversationState.saveChanges(bot.getConfig('context'));
    }

    /**
     * Ingests a message and evaluates it for triggers, run the receive middleware, and triggers any events.
     * Note: This is normally called automatically from inside `handleTurn()` and in most cases should not be called directly.
     * @param bot {BotWorker} An instance of the bot
     * @param message {BotkitMessage} an incoming message
     */
    private async ingest(bot: BotWorker, message: BotkitMessage): Promise<any> {
        return new Promise(async (resolve, reject) => {
            const listen_results = await this.listenForTriggers(bot, message);

            if (listen_results !== false) {
                resolve(listen_results);
            } else {
                this.middleware.receive.run(bot, message, async (err, bot, message) => {
                    if (err)  { 
                        return reject(err); 
                    }

                    // Trigger event handlers
                    const trigger_results = await this.trigger(message.type, bot, message);

                    resolve(trigger_results);
                });
            }
        });
    }

    /**
     * Evaluates an incoming message for triggers created with `controller.hears()` and fires any relevant handler functions.
     * @param bot {BotWorker} An instance of the bot
     * @param message {BotkitMessage} an incoming message
     */
    private async listenForTriggers(bot: BotWorker, message: BotkitMessage): Promise<any> {
        if (this._triggers[message.type]) {
            const triggers = this._triggers[message.type];
            for (var t = 0; t < triggers.length; t++) {
                const test_results = await this.testTrigger(triggers[t], message);
                if (test_results) {
                    debug('Heard pattern: ', triggers[t].pattern);
                    const trigger_results = await triggers[t].handler.call(this, bot, message);
                    return trigger_results;
                }
            }

            // nothing has triggered...return false
            return false;
        } else {
            return false;
        }
    }

    /**
     * Evaluates an incoming message for triggers created with `controller.interrupts()` and fires any relevant handler functions.
     * @param bot {BotWorker} An instance of the bot
     * @param message {BotkitMessage} an incoming message
     */
    private async listenForInterrupts(bot: BotWorker, message: BotkitMessage): Promise<any> {
        if (this._interrupts[message.type]) {
            const triggers = this._interrupts[message.type];
            for (var t = 0; t < triggers.length; t++) {
                const test_results = await this.testTrigger(triggers[t], message);
                if (test_results) {
                    debug('Heard interruption: ', triggers[t].pattern);
                    const trigger_results = await triggers[t].handler.call(this, bot, message);
                    return trigger_results;
                }
            }

            // nothing has triggered...return false
            return false;
        } else {
            return false;
        }
    }

    /**
     * Evaluates a single trigger and return true if the incoming message matches the conditions
     * @param trigger {BotkitTrigger} a trigger definition 
     * @param message {BotkitMessage} an incoming message
     */
    private async testTrigger(trigger: BotkitTrigger, message: BotkitMessage): Promise<boolean> {
        if (trigger.type === 'string') {
            const test = new RegExp(trigger.pattern as string,'i');
            if (message.text && message.text.match(test)) {
                return true;
            }
        } else if (trigger.type === 'regexp') {
            const test = trigger.pattern as RegExp;
            if (message.text && message.text.match(test)) {
                return true;
            }
        } else if (trigger.type === 'function') {
            const test = trigger.pattern as (message) => Promise<boolean> ;
            return await test(message);
        }

        return false;
    }

    /**
     * Instruct your bot to listen for a pattern, and do something when that pattern is heard.
     * Patterns will be "heard" only if the message is not already handled by an in-progress dialog.
     * To "hear" patterns _before_ dialogs are processed, use `controller.interrupts()` instead.
     * 
     * For example:
     * ```javascript
     * // listen for a simple keyword
     * controller.hears('hello','message', async(bot, message) => {
     *  await bot.reply(message,'I heard you say hello.');
     * });
     * 
     * // listen for a regular expression
     * controller.hears(new RegExp(/^[A-Z\s]+$/), 'message', async(bot, message) => {
     *  await bot.reply(message,'I heard a message IN ALL CAPS.');
     * });
     * 
     * // listen using a function
     * controller.hears(async (message) => { return (message.intent === 'hello') }, 'message', async(bot, message) => {
     *  await bot.reply(message,'This message matches the hello intent.');
     * });
     * ```
     * @param patterns {} One or more string, regular expression, or test function
     * @param events {} A list of event types that should be evaluated for the given patterns
     * @param handler {BotkitHandler}  a function that will be called should the pattern be matched
     */
    public hears(patterns: ( string | RegExp | { (message: BotkitMessage): Promise<boolean> })[] | RegExp | string | { (message: BotkitMessage): Promise<boolean> }, events: string | string[], handler: BotkitHandler) {

        if (!Array.isArray(patterns)) {
            patterns = [patterns];
        }

        if (typeof events === 'string') {
            events = events.split(/\,/).map(e => e.trim());
        }

        debug('Registering hears for ', events);
        
        for (var p = 0; p < patterns.length; p++) {
            for (var e = 0; e < events.length; e++) {
                const event = events[e];
                const pattern = patterns[p];

                if (!this._triggers[event]) {
                    this._triggers[event] = [];
                }

                const trigger = {
                    pattern: pattern,
                    handler: handler,
                    type: null,
                };

                if (typeof pattern === 'string') {
                    trigger.type = 'string';
                } else if (pattern instanceof RegExp) {
                    trigger.type = 'regexp';
                } else if (typeof pattern === 'function') {
                    trigger.type = 'function';
                }

                this._triggers[event].push(trigger);

            }
        }
    }

    /**
     * Instruct your bot to listen for a pattern, and do something when that pattern is heard.
     * Interruptions work just like "hears" triggers, but fire _before_ the dialog system is engaged,
     * and thus handlers will interrupt the normal flow of messages through the processing pipeline.
     * 
     * ```javascript
     * controller.interrupts('help','message', async(bot, message) => {
     * 
     *  await bot.reply(message,'Before anything else, you need some help!')
     * 
     * });
     * ```
     * @param patterns {} One or more string, regular expression, or test function
     * @param events {} A list of event types that should be evaluated for the given patterns
     * @param handler {BotkitHandler}  a function that will be called should the pattern be matched
     */
    public interrupts(patterns: ( string | RegExp | { (message: BotkitMessage): Promise<boolean> })[] | RegExp | RegExp[] | string | { (message: BotkitMessage): Promise<boolean> }, events: string | string[], handler: BotkitHandler) {

        if (!Array.isArray(patterns)) {
            patterns = [patterns];
        }

        if (typeof events === 'string') {
            events = events.split(/\,/).map(e => e.trim());
        }
        debug('Registering hears for ', events);

        for (var p = 0; p < patterns.length; p++) {
            for (var e = 0; e < events.length; e++) {
                var event = events[e];
                var pattern = patterns[p];

                if (!this._interrupts[event]) {
                    this._interrupts[event] = [];
                }

                const trigger = {
                    pattern: pattern,
                    handler: handler,
                    type: null,
                };

                if (typeof pattern === 'string') {
                    trigger.type = 'string';
                } else if (pattern instanceof RegExp) {
                    trigger.type = 'regexp';
                } else if (typeof pattern === 'function') {
                    trigger.type = 'function';
                }

                this._interrupts[event].push(trigger);

            }
        }
    }

    /**
     * Bind a handler function to one or more events.
     * 
     * ```javascript
     * controller.on('conversationUpdate', async(bot, message) => {
     * 
     *  await bot.reply(message,'I received a conversationUpdate event.');
     * 
     * });
     * ```
     * 
     * @param events {string | string[]} One or more event names
     * @param handler {BotkitHandler} a handler function that will fire whenever one of the named events is received.
     */
    public on(events: string | string[], handler: BotkitHandler) {

        if (typeof events === 'string') {
            events = events.split(/\,/).map(e => e.trim());
        }

        debug('Registering handler for: ', events);
        events.forEach((event) => {
            if (!this._events[event]) {
                this._events[event] = [];
            }
            this._events[event].push(handler);
        });
    }

    /**
     * Trigger an event to be fired.  This will cause any bound handlers to be executed.
     * Note: This is normally used internally, but can be used to emit custom events.
     * 
     * ```javascript
     * // fire a custom event
     * controller.trigger('my_custom_event', bot, message);
     * 
     * // handle the custom event
     * controller.on('my_custom_event', async(bot, message) => {
     *  //... do something
     * });
     * ```
     * 
     * @param event {string} the name of the event
     * @param bot {BotWorker} a BotWorker instance created using `controller.spawn()`
     * @param message {BotkitMessagE} An incoming message or event
     */
    public async trigger(event: string, bot: BotWorker, message: BotkitMessage): Promise<any> {
        debug('Trigger event: ', event);
        if (this._events[event] && this._events[event].length) {
            for (var h = 0; h < this._events[event].length; h++) {
                const handler_results = await this._events[event][h].call(bot, bot, message);
                if (handler_results === false) {
                    break;
                }
            }
        }
    }

    /**
     * Create a platform-specific BotWorker instance that can be used to respond to messages or generate new outbound messages.
     * The spawned `bot` contains all information required to process outbound messages and handle dialog state, and may also contain extensions
     * for handling platform-specific events or activities.
     * @param config {any} Preferably receives a DialogContext, though can also receive a TurnContext. If excluded, must call `bot.changeContext(reference)` before calling any other method.
     */
    public spawn(config: any): Promise<BotWorker> {
   
        if (config instanceof TurnContext) {
            config = {
                // TODO: What about a dialog context here?  PROBLEMATIC!
                context: config,
                reference: TurnContext.getConversationReference(config.activity),
                activity: config.activity,
            };
        } else if (config instanceof DialogContext) {
            config = {
                dialogContext: config,
                reference: TurnContext.getConversationReference(config.context.activity),
                context: config.context,
                activity: config.context.activity
            };
        }

        let worker: BotWorker = null;
        if (this.adapter.botkit_worker) {
            worker = new this.adapter.botkit_worker(this, config);
        } else {
            worker = new BotWorker(this, config);
        }

        return new Promise((resolve, reject) => {
            this.middleware.spawn.run(worker, (err, worker) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(worker);
                }
            });
        });
    }

    /**
     * Load a Botkit feature module
     * 
     * @param p {string} path to module file
     */
    public loadModule(p: string): void {
        debug('Load Module:', p);
        require(p)(this);
    }

    /**
     * Load all Botkit feature modules located in a given folder.
     * 
     * ```javascript
     * controller.ready(() => {
     * 
     *  // load all modules from sub-folder features/
     *  controller.loadModules('./features');
     * 
     * });
     * ```
     * 
     * @param p {string} path to a folder of module files
     */
    public loadModules(p: string): void {
        // load all the .js files from this path
        fs.readdirSync(p).filter((f) => { return (path.extname(f) === '.js'); }).forEach((file) => {
            this.loadModule(path.join(p,file));
        });
    }
}