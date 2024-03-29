import { AppData } from '../models/app-data';
import * as pathUtils from './path.utils';
import * as fs from 'fs';

export function readAppData(): AppData {
	const dataFile = pathUtils.fromAppData('data.json');
	if (!fs.existsSync(dataFile) || !fs.lstatSync(dataFile).isFile()) {
		this.writeAppData({
			'projects': []
		});
	}
	return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
}

export function writeAppData(appData: AppData): void {
	const dataFile = pathUtils.fromAppData('data.json');
	fs.writeFileSync(dataFile, JSON.stringify(appData));
}
