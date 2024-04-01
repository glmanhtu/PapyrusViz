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

export async function getFilesRecursively(directory: string, topLvDir = '', level = 0): Promise<Map<string, string[]>> {
    let imageMap = new Map<string, string[]>();
    const filesInDirectory = await fs.readdir(directory);
    for (let i = 0; i < filesInDirectory.length; i++) {
        const absolute = path.join(directory, filesInDirectory[i]);
        let currentTopLvDir = topLvDir;
        if ((await fs.stat(absolute)).isDirectory()) {
            if (level === 0) {
                currentTopLvDir = absolute
            }
            const dirImageMap = await getFilesRecursively(absolute, currentTopLvDir, level + 1);
            imageMap = new Map([...Array.from(imageMap.entries()), ...Array.from(dirImageMap.entries())]);
        } else {
            const fileExt = absolute.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png'].includes(fileExt)) {
                const images: string[] = imageMap.get(currentTopLvDir) || [];
                images.push(absolute);
                imageMap.set(currentTopLvDir, images)
            }
        }
    }
    if (!imageMap.has(topLvDir) && level === 0) {
        imageMap.set(topLvDir, [])
    }
    return imageMap;
}