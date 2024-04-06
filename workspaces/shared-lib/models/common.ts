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

export type Progress = {
	percentage: number,
	title: string,
	description: string
}


export interface IMessage<R> {
	status: string,
	payload: R | string,
}


export class Message<R> implements IMessage<R> {

	status: string;
	payload: R | string;

	public constructor(status: string, payload: R) {
		this.status = status;
		this.payload = payload;
	}

	public static success<R>(payload: R) : IMessage<R> {
		return new Message<R>('success', payload);
	}

	public static warning<R>(payload: R) : IMessage<R> {
		return new Message<R>('warning', payload);
	}

	public static complete(message: string) : IMessage<string> {
		return new Message<string>('complete', message);
	}

	public static error(message: string): IMessage<string> {
		return new Message<string>('error', message);
	}
}