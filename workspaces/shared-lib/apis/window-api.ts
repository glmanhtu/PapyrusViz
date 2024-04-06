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

import { IMessage } from '../models/common';

export interface WindowApi {

	/**
	 * This method is used by the renderer process to send data to the main process and wait to receive the result
	 * @param type used by the renderer to send data and by the main to receive them
	 * @param payload the data sent by the renderer process to the main process
	 */
	send<P, R>(type: string, payload: P): Promise<R>;

	sendAndListen<P, R>(type: string, payload: P,  listener: (message: IMessage<R>) => void): void;
}
