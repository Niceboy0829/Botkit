"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const botbuilder_1 = require("botbuilder");
const debug = require('debug')('botkit:worker');
class BotWorker {
    constructor(controller, config) {
        this._controller = controller;
        this._config = Object.assign({}, config);
    }
    /* Return a value out of the configuration */
    getConfig(key) {
        if (key) {
            return this._config[key];
        }
        else {
            return this._config;
        }
    }
    /* Send a message using information passed in during spawning */
    say(message) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const activity = ensureMessageFormat(message);
                this._controller.middleware.send.run(this, activity, (err, bot, activity) => {
                    this._controller.adapter.continueConversation(this._config.reference, (outgoing_context) => __awaiter(this, void 0, void 0, function* () {
                        resolve(yield outgoing_context.sendActivity(activity));
                    }));
                });
            });
        });
    }
    ;
    /* Send a reply to an inbound message, using information collected from that inbound message */
    reply(src, resp) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const activity = ensureMessageFormat(resp);
                // get conversation reference from src
                const reference = botbuilder_1.TurnContext.getConversationReference(src.incoming_message);
                // use the new reference to send the outgoing message
                this._controller.middleware.send.run(this, activity, (err, bot, activity) => {
                    this._controller.adapter.continueConversation(reference, (outgoing_context) => __awaiter(this, void 0, void 0, function* () {
                        resolve(yield outgoing_context.sendActivity(activity));
                    }));
                });
            });
        });
    }
    /* Begin a BotBuilder dialog */
    beginDialog(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._config.dialogContext) {
                return yield this._config.dialogContext.beginDialog(id, options);
            }
            else {
                throw new Error('Call to beginDialog on a bot that did not receive a dialogContext during spawn');
            }
        });
    }
}
exports.BotWorker = BotWorker;
function ensureMessageFormat(msg) {
    if (typeof (msg) === 'string') {
        msg = {
            text: msg
        };
    }
    return msg;
}
//# sourceMappingURL=botworker.js.map