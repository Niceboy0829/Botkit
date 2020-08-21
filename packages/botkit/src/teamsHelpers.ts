/**
 * @module botkit
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Botkit, BotkitMessage } from './core';
import { BotWorker } from './botworker';
import { TeamsInfo, MiddlewareSet, TurnContext, TaskModuleTaskInfo } from 'botbuilder';

/**
 * An extension of the core BotWorker class that exposes the TeamsInfo helper class for MS Teams.
 * This BotWorker is used with the built-in Bot Framework adapter.
 */
export class TeamsBotWorker extends BotWorker {

  public constructor(controller: Botkit, config) {
    super(controller, config);
  }

  /**
   *  Grants access to the TeamsInfo helper class
   * See: https://docs.microsoft.com/en-us/javascript/api/botbuilder/teamsinfo?view=botbuilder-ts-latest
   */
  public teams: TeamsInfo = TeamsInfo;

  /**
   * Reply to a Teams task module task/fetch or task/submit with a task module response.
   * See https://docs.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots
   * @param message 
   * @param taskInfo { type: 'continue|message', value: {} } 
   */
  public async replyWithTaskInfo(message: BotkitMessage, taskInfo: any) {
    if (!taskInfo || taskInfo == {}) {
      // send a null response back
      taskInfo  = {
        type: 'message',
        value: '',
      }
    }
    return new Promise((resolve, reject) => {
      this.controller.middleware.send.run(this, taskInfo, async (err, bot, taskInfo) => {
        if (err) {
            return reject(err);
        }
        resolve(await this.getConfig('context').sendActivity({
          type: 'invokeResponse',
          value: {
              status: 200,
              body: {
                task: taskInfo
              }
          }
        }));
      });
    });
  }
}

/**
 * When used, causes Botkit to emit special events for teams "invokes"
 * Based on https://github.com/microsoft/botbuilder-js/blob/master/libraries/botbuilder/src/teamsActivityHandler.ts
 * This allows Botkit bots to respond directly to task/fetch or task/submit events, as an example.
 */
export class TeamsInvokeMiddleware extends MiddlewareSet {
    /**
     * Not for direct use - implements the MiddlewareSet's required onTurn function used to process the event
     * @param context
     * @param next
     */
    public async onTurn(context: TurnContext, next: () => Promise<any>): Promise<void> {
      if (context.activity.type === 'invoke') {
        if (!context.activity.name && context.activity.channelId === 'msteams') {
          context.activity.channelData.botkitEventType = 'cardAction';
        } else {
          switch (context.activity.name) {
            case 'fileConsent/invoke':
            case 'actionableMessage/executeAction':
            case 'composeExtension/queryLink':
            case 'composeExtension/query':
            case 'composeExtension/selectItem':
            case 'composeExtension/submitAction':
            case 'composeExtension/fetchTask':
            case 'composeExtension/querySettingUrl':
            case 'composeExtension/setting':
            case 'composeExtension/onCardButtonClicked':
            case 'task/fetch':
            case 'task/submit':
              context.activity.channelData.botkitEventType = context.activity.name;
              break;
          }
        }
      }
      await next();
  }
}
