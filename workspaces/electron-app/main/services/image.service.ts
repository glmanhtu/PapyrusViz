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

import { Category } from '../entities/category';
import { Img, imgTbl } from '../entities/img';
import path from 'node:path';
import sharp from 'sharp';
import { eq, like } from 'drizzle-orm';
import { dbService } from './database.service';
import { ImgDto } from 'shared-lib';

class ImageService {

	public resolveImg(category: Category, img: Img | ImgDto): Img | ImgDto {
		return {
			...img,
			path: 'atom://' + path.join(category.path, img.path)
		}
	}

	public async findBestMatchByName(projectPath: string, name: string): Promise<Img[]> {
		const database = dbService.getConnection(projectPath);
		return database.select()
			.from(imgTbl).where(eq(imgTbl.name, name))
			.orderBy(imgTbl.name);
	}

	public async findBestMatchByPath(projectPath: string, name: string): Promise<Img[]> {
		const database = dbService.getConnection(projectPath);
		return database.select()
			.from(imgTbl).where(like(imgTbl.path, '%' + name + '%'))
			.orderBy(imgTbl.name);
	}

	public async resize(inputFile: string, outputFile: string, width: number, height: number) {
		return sharp(inputFile)
			.resize({ height: height, width: width })
			.flatten({ background: { r: 255, g: 255, b: 255 } })
			.toFile(outputFile);
	}

	public async metadata(inputFile: string) {
		return sharp(inputFile).metadata();
	}
}

const imageService = new ImageService();
export { imageService };