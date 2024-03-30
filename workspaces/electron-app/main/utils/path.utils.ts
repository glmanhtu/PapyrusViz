import {app} from 'electron';
import * as path from 'node:path';
import { promises as fs } from 'fs';



export function fromRoot(...paths: string[]) {
    return path.join(app.getAppPath(), ...paths);
}


export async function fromAppData(...paths: string[]) {
    const appDataPath = path.join(app.getPath('appData'), 'papyviz')
    const isExists = await isDir(appDataPath);
    if (!isExists) {
        await fs.mkdir(appDataPath);
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

export async function isFile(f: string) {
    return await exists(f) && (await fs.lstat(f)).isFile();
}

export function projectFile(projectPath: string) {
    return path.join(projectPath, 'project.db');
}