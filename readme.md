# Botkit Next Major Release

This branch is home to the next major release of Botkit, which is based on a complete rewrite of the library.

**This is a not a finished product!** We are publishing it now as a preview so our community of 
developers, users and contributors can get involved. Some features are missing or not working,
and some features currently included may be removed. 

<a href="https://github.com/howdyai/botkit/projects/9">View the roadmap planning board for this release</a>

GOALS:
* Keep as much of the feature set, syntax and special sauce developers know and love
* Solve persistent and hard to solve problems in previous versions of Botkit
* Use modern JavaScript language features like async/await instead of callbacks
* Full Typescript support
* Break platform adapters (and their large dependency trees) into optional packages
* Reorganize some related projects into a monorepo
* Inherit much goodness from [Bot Builder](https://github.com/microsoft/botbuilder-js)
* Provide a way for bots to be extended with plugins and modular features, and for those plugins to provide a consistent interface to administrators


# Use Botkit

* [Install Botkit and get started](packages/botkit#botkit---building-blocks-for-building-bots)
* [Botkit Core Docs](packages/docs/index.md)
* [Botkit for the Web](packages/botbuilder-adapter-websocket/readme.md)
* [Botkit for Slack](packages/botbuilder-adapter-slack/readme.md)
* [Botkit for Webex Teams](packages/botbuilder-adapter-webex/readme.md)
* [Botkit for Google Hangouts](packages/botbuilder-adapter-hangouts/readme.md)
* [Botkit for Twilio SMS](packages/botbuilder-adapter-twilio-sms/readme.md)
* [Botkit for Facebook Messenger](packages/botbuilder-adapter-facebook/readme.md)

## Packages included in this repo

| Package | Description
|--- |---
| [botkit](packages/botkit) | Botkit Core library
| [botbuilder-adapter-websocket](packages/botbuilder-adapter-websocket) | A platform adapter for the web
| [botbuilder-adapter-slack](packages/botbuilder-adapter-slack) | A platform adapter for Slack
| [botbuilder-adapter-webex](packages/botbuilder-adapter-webex) | A platform adapter for Webex Teams
| [botbuilder-adapter-hangouts](packages/botbuilder-adapter-hangouts) | A platform adapter for Google Hangouts
| [botbuilder-adapter-twilio-sms](packages/botbuilder-adapter-twilio-sms) | A platform adapter for Twilio SMS
| [botbuilder-adapter-facebook](packages/botbuilder-facebook) | A platform adapter for Facebook Messenger
| [generator-botkit](packages/generator-botkit) | A Yeoman generator for creating a new Botkit project
| [botbuilder-dialogs-botkit-cms](packages/botbuilder-dialogs-botkit-cms) | A library that allows using Botkit CMS content in Bot Builder apps (without Botkit)

## Build Botkit locally

This repo contains multiple inter-linked packages containing Botkit Core, platform adapter packages, and some additional plugins and extensions.
To build these locally, follow the instructions below.

Install [lerna](https://github.com/lerna/lerna) and [TypeScript](https://www.typescriptlang.org/) globally:

```bash
npm install -g typescript
npm install -g lerna
```

Clone the entire Botkit project from Github.

```bash
git clone git@github.com:howdyai/botkit.git
```

Enter the new folder, and switch to the `next` branch.

```bash
cd botkit
git checkout next
npm install
```

Use lerna to set up the local packages:

```bash
lerna bootstrap --hoist
```

Now, build all of the libraries:

```bash
lerna run build
```

To build updated versions of the class reference documents found in `packages/docs`, run:

```bash
lerna run build-docs
```
