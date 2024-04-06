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

#!/usr/bin/env node
const spawn = require('child_process').spawn;
const chokidar = require('chokidar');
const kill = require('tree-kill');
const path = require('path');

class ElectronForgeRunner {
	constructor() {
		this.__init__();
	}

	__init__ = () => {
		this.args = process.argv;
		this.command = this.args[2];
		this.cwd = process.cwd();
		this.watchPaths = [
			path.join(this.cwd, '/workspaces/electron-app/**/*.ts'),
			path.join(this.cwd, '/workspaces/shared-lib/.dist/**/*.ts'),
		];
		this.ignoredPaths = '**/node_modules/*';

		this.startWatching();
		this.reload();
	};

	reload = () => {
		if (this.childProcess) kill(this.childProcess.pid);
		this.childProcess = spawn('npm run start:electron-app:once', [], {
			shell: true,
			stdio: 'inherit',
		});
	};

	startWatching = () => {
		chokidar
			.watch(this.watchPaths, {
				ignored: this.ignoredPaths,
				ignoreInitial: true,
			})
			.on('all', (event, path) => {
				this.reload();
			});
	};
}

new ElectronForgeRunner();
