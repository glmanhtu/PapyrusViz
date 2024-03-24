import {app} from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';


export function fromRoot(...paths: string[]) {
    return path.join(app.getAppPath(), ...paths);
}


export function fromAppData(...paths: string[]) {
    const appDataPath = path.join(app.getPath('appData'), 'papyviz')
    const isExists = fs.existsSync(appDataPath) && fs.lstatSync(appDataPath).isDirectory();
    if (!isExists) {
        fs.mkdirSync(appDataPath);
    }
    return path.join(appDataPath, ...paths);
}