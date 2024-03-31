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

export const takeUniqueOrThrow = <T>(values: T[]): T => {
	if (values.length !== 1)
		throw new Error("Found non unique or inexistent value");
	return values[0]!;
};