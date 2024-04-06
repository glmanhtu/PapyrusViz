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

import { IMessage } from 'shared-lib';

export abstract class BaseHandler {
	private routes: Map<string, (payload: unknown) => Promise<unknown>>;
	private continuousHandlers: Map<string, (payload: unknown, reply: (message: IMessage<unknown>) => void) => Promise<void>>;


	constructor() {
		this.routes = new Map();
		this.continuousHandlers = new Map();
	}

	protected addRoute(action: string, method: (payload: unknown) => Promise<unknown>): void {
		this.routes.set(action, method);
	}

	protected addContinuousRoute(action: string, method: (payload: unknown, reply: (message: IMessage<unknown>) => void) => Promise<void>): void {
		this.continuousHandlers.set(action, method);
	}

	public getRoutes(): Map<string, (payload: unknown) => Promise<unknown>> {
		return this.routes;
	}

	public getContinuousHandlers(): Map<string, (payload: unknown, reply: (message: IMessage<unknown>) => void) => Promise<void>> {
		return this.continuousHandlers;
	}
}