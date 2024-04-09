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
import { BrowserWindow } from 'electron';

export class AppHandler extends BaseHandler {
	constructor(private readonly mainWin: BrowserWindow) {
		super();
		this.addRoute('app:quit', this.quit.bind(this));
		this.mainWin = mainWin;
	}

	private async quit(): Promise<void> {
		this.mainWin.close();
	}
}