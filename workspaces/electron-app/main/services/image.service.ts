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
import { eq, like, or } from 'drizzle-orm';
import { dbService } from './database.service';
import { ImgDto } from 'shared-lib';
import * as ort from 'onnxruntime-node';

class ImageService {

	public resolveImg(category: Category, img: Img | ImgDto): Img | ImgDto {
		return {
			...img,
			path: 'atom://' + path.join(category.path, img.path)
		}
	}

	public async extractImageFeatures(img: Img, category: Category): Promise<void> {
		const scale = 1024.0 / Math.max(img.width, img.height);
		const width = Math.round(img.width * scale);
		const height = Math.round(img.height * scale);
		const { data, info } = await sharp(path.join(category.path, img.path))
			.resize({ width: width, height: height })
			.flatten({ background: { r: 255, g: 255, b: 255 } })
			.raw()
			.toBuffer({ resolveWithObject: true });

		const pixelArray = new Uint8ClampedArray(data.buffer);
		const imgTensor = new ort.Tensor('uint8', new Uint8Array(pixelArray.buffer), [1, 3, height, width]);
		console.log("test")
	}

	public async findBestMatchByName(projectPath: string, name: string): Promise<Img[]> {
		const database = dbService.getConnection(projectPath);
		return database.select()
			.from(imgTbl).where(
				or(
					eq(imgTbl.name, name),
					like(imgTbl.name, `${name}-_`)
				))
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