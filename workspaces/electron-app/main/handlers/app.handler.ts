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

import { BaseHandler } from "./base.handler";
import { App } from '../components/app';
import { WindowTask } from 'shared-lib';

export class AppHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute('app:quit', this.quit.bind(this));
		this.addRoute('app:open-similarity', this.openSimilarityPage.bind(this));
		this.addRoute('app:get-task', this.getTask.bind(this));
	}

	private async quit(): Promise<void> {
		for (const win of App.getWindows()) {
			win.electronWindow.close();
		}
	}

	private async openSimilarityPage(projectPath: string): Promise<void> {
		const data: WindowTask = {
			projectPath: projectPath,
			task: 'similarity'
		}
		App.createWindow(data);
	}

	private async getTask(_: unknown, clientId: number): Promise<unknown> {
		return new Promise(resolve => {
			return resolve(App.getTask(clientId))
		});
	}
}