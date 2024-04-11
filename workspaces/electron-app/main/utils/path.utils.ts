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
    const imageMap = new Map<string, string[]>();
    const filesInDirectory = await fs.readdir(directory);
    for (let i = 0; i < filesInDirectory.length; i++) {
        const absolute = path.join(directory, filesInDirectory[i]);
        let currentTopLvDir = topLvDir;
        if ((await fs.stat(absolute)).isDirectory()) {
            if (level === 0) {
                currentTopLvDir = absolute
            }
            const dirImageMap = await getFilesRecursively(absolute, currentTopLvDir, level + 1);
            dirImageMap.forEach((values, key) => {
                if (!imageMap.has(key)) {
                    imageMap.set(key, [])
                }
                imageMap.get(key).push(...values)
            })
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