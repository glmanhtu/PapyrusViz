import { AppData } from '../models/app-data';
import * as pathUtils from './path.utils';
import * as fs from 'fs';

export async function readAppData(): Promise<AppData> {
	const dataFile = pathUtils.fromAppData('data.json');
	if (!fs.existsSync(dataFile) || !fs.lstatSync(dataFile).isFile()) {
		await this.writeAppData({
			'projects': []
		});
	}
	return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

export async function writeAppData(appData: AppData): Promise<void> {
	const dataFile = pathUtils.fromAppData('data.json');
	fs.writeFileSync(dataFile, JSON.stringify(appData));
}
