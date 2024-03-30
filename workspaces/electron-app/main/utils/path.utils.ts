import {app} from 'electron';
import * as path from 'node:path';
import * as fsSync from 'fs';
import { promises as fs } from 'fs';



export function fromRoot(...paths: string[]) {
    return path.join(app.getAppPath(), ...paths);
}


export function fromAppData(...paths: string[]) {
    const appDataPath = path.join(app.getPath('appData'), 'papyviz')
    const isExists = fsSync.existsSync(appDataPath) && fsSync.lstatSync(appDataPath).isDirectory();
    if (!isExists) {
        fsSync.mkdirSync(appDataPath);
    }
    return path.join(appDataPath, ...paths);
}

export async function exists(f: string) {
    try {
        await fs.access(f);
        return true;
    } catch {
        return false;
    }
}

export async function isDir(f: string) {
    return await exists(f) && (await fs.lstat(f)).isDirectory();
}