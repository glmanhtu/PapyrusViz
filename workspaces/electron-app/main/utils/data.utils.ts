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

import { AppData } from '../models/app-data';
import * as pathUtils from './path.utils';
import { promises as fs } from 'fs';


export async function readAppData(): Promise<AppData> {
	const dataFile = await pathUtils.fromAppData('data.json');
	if (!await pathUtils.isFile(dataFile)) {
		await this.writeAppData({
			'projects': []
		});
	}
	return JSON.parse(await fs.readFile(dataFile, 'utf-8'));
}

export async function writeAppData(appData: AppData): Promise<void> {
	const dataFile = await pathUtils.fromAppData('data.json');
	await fs.writeFile(dataFile, JSON.stringify(appData));
}

class UniqueConstraintError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UniqueConstraintError";
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, UniqueConstraintError);
		}
	}
}


export const takeUniqueOrThrow = <T>(values: T[]): T => {
	if (values.length !== 1)
		throw new UniqueConstraintError("Found non unique or inexistent value");
	return values[0]!;
};

export const takeFirstOrThrow = <T>(values: T[]): T => {
	if (values.length < 1)
		throw new UniqueConstraintError("No item found");
	return values[0]!;
};