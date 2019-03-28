/**
 * @module botkit
 */
import { Botkit, BotkitMessage } from './core';
import { Activity, ConversationReference, TurnContext } from 'botbuilder';
import { BotkitConversation } from './conversation';
const debug = require('debug')('botkit:worker');


export class BotWorker {
    private _controller: Botkit;
    private _config: any;

    constructor(controller, config) {
        this._controller = controller;
        this._config = {
            ...config
        };

    }

    get controller() {
        return this._controller;
    }

    /* Return a value out of the configuration */
    public getConfig(key?: string) {
        if (key) {
            return this._config[key];
        } else {
            return this._config;
        }
    }

    /* Send a message using information passed in during spawning */
    public async say(message: Partial<BotkitMessage>): Promise<any> {
        return new Promise((resolve, reject) => {
            let activity = this.ensureMessageFormat(message);

            this._controller.middleware.send.run(this, activity, (err, bot, activity) => {
                // NOTE: This calls the BotBuilder middleware again...
                this._controller.adapter.continueConversation(this._config.reference, async (outgoing_context) => {
                    resolve(await outgoing_context.sendActivity(activity));
                });
            });
        });
    };

    /* Send a reply to an inbound message, using information collected from that inbound message */
    public async reply(src: Partial<BotkitMessage>, resp: Partial<BotkitMessage>): Promise<any> {
        return new Promise((resolve, reject) => {
            let activity = this.ensureMessageFormat(resp);

            // get conversation reference from src
            const reference = TurnContext.getConversationReference(src.incoming_message);
            
            // use the new reference to send the outgoing message
            this._controller.middleware.send.run(this, activity, (err, bot, activity) => {
                // NOTE: This calls the BotBuilder middleware again...
                this._controller.adapter.continueConversation(reference, async (outgoing_context) => {
                    resolve(await outgoing_context.sendActivity(activity));
                });
            });
        });
    }

    /* Begin a BotBuilder dialog */
    public async beginDialog(id, options) {
        if (this._config.dialogContext) {
            await this._config.dialogContext.beginDialog(id, options);

            // make sure we save the state change caused by the dialog.
            // this may also get saved again at end of turn
            await this._controller.saveState(this);
        } else {
            throw new Error('Call to beginDialog on a bot that did not receive a dialogContext during spawn');
        }
    }

    public async changeContext(reference: Partial<ConversationReference>): Promise<BotWorker> {

        // change context of outbound activities to use this new address
        this._config.reference = reference;

        // Create an activity using this reference
        const activity = TurnContext.applyConversationReference(
            { type: 'message' },
            reference,
            true
        );

        // create a turn context
        const turnContext = new TurnContext(this._controller.adapter, activity as Activity);

        // create a new dialogContext so beginDialog works.
        const dialogContext = await this._controller.dialogSet.createContext(turnContext);

        this._config.context = turnContext;
        this._config.dialogContext = dialogContext;
        this._config.activity = activity;

        return this;
    }

    /**
     * Take a crudely-formed Botkit message with any sort of field
     * and map it into a beautiful BotFramework activity
     */
    public ensureMessageFormat(message: any): Partial<Activity> {

        let activity: Partial<Activity> = {};

        if (typeof(message) === 'string') {
            activity = {
                type: 'message',
                text: message,
                channelData: {}
            };
        } else {

            // set up a base message activity
            activity = {
                type: 'message',
                text: message.text,

                attachmentLayout: message.attachmentLayout,
                attachments: message.attachments,

                suggestedActions: message.suggestedActions,

                speak: message.speak,
                inputHint: message.inputHint,
                summary: message.summary,
                textFormat: message.textFormat,
                importance: message.importance,
                deliveryMode: message.deliveryMode,
                expiration: message.expiration,
                value: message.value,
                channelData: {
                    ...message.channelData
                }
            }

            // Now, copy any additional fields not in the activity into channelData
            // This way, any fields added by the developer to the root object
            // end up in the approved channelData location.
            for (var key in message) {
                if (key != 'channelData' && !activity[key]) {
                    activity.channelData[key] = message[key];
                }
            }

        }

        return activity;
    }

    /* 
     * set the http response status for this turn
     * @param status (number) a valid http status code like 200 202 301 500 etc
     */
    public httpStatus(status: number) {
        this.getConfig('context').turnState.set('httpStatus', status);
    }

    /* 
     * set the http response body for this turn
     * @param body (any) a value that will be returned as the http response body
     */
    public httpBody(body: any) {
        this.getConfig('context').turnState.set('httpBody', body);
    }


}


