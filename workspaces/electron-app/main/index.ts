import * as fs from 'fs-extra';
import _ from 'lodash';
import * as path from 'node:path';
import { GlobalConfig } from 'shared-lib';
import { App } from './components/app';
import { DialogHandler } from './handlers/dialog.handler';
import { ProjectHandler } from './handlers/project.handler';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

declare const global: GlobalConfig;

// Load config
const currentEnvironment = process.env.X_NODE_ENV || process.env.NODE_ENV;
const appConfigs = fs.readJsonSync(path.join(__dirname, 'config.json'));
const defaultConfig = appConfigs.development;
const currentConfig = appConfigs[currentEnvironment];
global.appConfig =
	currentEnvironment === 'development'
		? defaultConfig
		: _.merge(defaultConfig, currentConfig);


const databases = new Map<string, BetterSQLite3Database>();
// Launch app
App.launch((mainWin) => {

	const handlers = [
		new DialogHandler(mainWin),
		new ProjectHandler(databases)
	]
	App.registerHandlers(handlers);
});

