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
import * as syncFs from 'fs';
import { promises as fs } from 'fs';
import { Img } from '../entities/img';


const currentEnvironment = process.env.X_NODE_ENV || process.env.NODE_ENV;

export function fromRoot(...paths: string[]) {
    return path.join(app.getAppPath(), ...paths);
}


export function fromResource(...paths: string[]) {
    if (currentEnvironment === 'production') {
        return path.join(process.resourcesPath, 'resources', ...paths);
    }
    return fromRoot('resources', ...paths);
}


export function segmentationPath(img: Img) {
    const components = path.parse(img.path);
    const thumbnailName = components.name + '.webp';
    const basePath = components.dir.replace(components.root, '');
    const segmentation_dir = fromAppData('segmentation', basePath);
    return path.join(segmentation_dir, thumbnailName);
}

export function deleteFile(filePath: string) {
    return syncFs.rmSync(filePath);
}

export function fromAppData(...paths: string[]) {
    const appDataPath = path.join(app.getPath('appData'), 'papyviz')
    const isExists = isDir(appDataPath);
    if (!isExists) {
         syncFs.mkdirSync(appDataPath);
    }
    return path.join(appDataPath, ...paths);
}

export function exists(f: string) {
    try {
        syncFs.accessSync(f);
        return true;
    } catch {
        return false;
    }
}

export async function isDir(f: string) {
    return exists(f) && syncFs.lstatSync(f).isDirectory();
}

export async function isFile(f: string) {
    return exists(f) && syncFs.lstatSync(f).isFile();
}

export function projectFile(projectPath: string) {
    return path.join(projectPath, 'project.db');
}

export function replaceProtocol(url: string, fromProtocol: string, toProtocol: string) {
    return toProtocol + url.slice(fromProtocol.length);
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