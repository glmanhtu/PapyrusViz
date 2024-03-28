import * as fs from 'fs-extra';
import _ from 'lodash';
import * as path from 'node:path';
import { GlobalConfig } from 'shared-lib';
import { App } from './components/app';
import * as pathUtils from './utils/path.utils';
import * as databaseUtils from './utils/database.utils';
import { DialogHandler } from './handlers/dialog.handler';
import { ProjectHandler } from './handlers/project.handler';

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


const databaseFile = pathUtils.fromAppData('data.db');
const database = databaseUtils.createConnection(databaseFile);

databaseUtils.migrateDatabase(database, path.join(__dirname, 'schema'));
// Launch app
App.launch((mainWin) => {

	const handlers = [
		new DialogHandler(mainWin),
		new ProjectHandler(database)
	]
	App.registerHandlers(handlers);
});

