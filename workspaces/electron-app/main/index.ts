/*
 * Copyright (C) 2024  Manh Tu VU
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as fs from 'fs-extra';
import _ from 'lodash';
import * as path from 'node:path';
import { GlobalConfig } from 'shared-lib';
import { App } from './components/app';
import { DialogHandler } from './handlers/dialog.handler';
import { ProjectHandler } from './handlers/project.handler';
import { CategoryHandler } from './handlers/category.handler';
import { ImageHandler } from './handlers/image.handler';
import { AssemblingHandler } from './handlers/assembling.handler';
import { MenuHandler } from './handlers/menu.handler';
import { MatchingHandler } from './handlers/matching.handler';

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

// Launch app
App.launch((mainWin) => {

	const handlers = [
		new DialogHandler(mainWin),
		new MenuHandler(mainWin),
		new ProjectHandler(),
		new CategoryHandler(),
		new ImageHandler(),
		new AssemblingHandler(),
		new MatchingHandler()
	]
	App.registerHandlers(handlers);
});

