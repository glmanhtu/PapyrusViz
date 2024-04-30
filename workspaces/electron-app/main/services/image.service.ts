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
import { ImgDto, SegmentationPoint } from 'shared-lib';
import * as ort from 'onnxruntime-node';
import { BBox } from '../models/utils';
import * as pathUtils from '../utils/path.utils';
import winston from 'winston';

class ImageService {

	private featureExtractor: ort.InferenceSession;
	private maskDetector: ort.InferenceSession;

	private embeddingMap = new Map<number, Promise<ort.Tensor>>

	public async getEmbedding(imgId: number): Promise<ort.Tensor> {
		return this.embeddingMap.get(imgId);
	}

	constructor() {
		const options = { intraOpNumThreads: 1, enableCpuMemArena: false };
		ort.InferenceSession.create(path.join(__dirname, 'ml-models', 'mobile_sam_preprocess.onnx'), options).then((session: ort.InferenceSession) => {
			this.featureExtractor = session;
			console.log("Mobile SAM preprocessor loaded");
		});
		ort.InferenceSession.create(path.join(__dirname, 'ml-models', 'mobile_sam.onnx'), options).then((session: ort.InferenceSession) => {
			this.maskDetector = session;
			console.log("Mobile SAM loaded");
		});
	}

	public resolveImg(category: Category, img: Img | ImgDto): Img | ImgDto {
		return {
			...img,
			path: 'atom://' + path.join(category.path, img.path),
			fragment: img.fragment !== '' ? 'atom://' + pathUtils.segmentationPath(img as Img) : ''
		}
	}

	public async registerImageFeatures(img: Img, category: Category): Promise<void> {
		const scale = 1024.0 / Math.max(img.width, img.height);
		const width = Math.round(img.width * scale);
		const height = Math.round(img.height * scale);
		const data = await sharp(path.join(category.path, img.path))
			.resize({ width: width, height: height })
			.flatten({ background: { r: 255, g: 255, b: 255 } })
			.raw()
			.toBuffer();

		const pixelArray = new Uint8ClampedArray(data.buffer);
		const imgTensor = new ort.Tensor('uint8', new Uint8Array(pixelArray.buffer), [1, height, width, 3]);
		const feed = { 'transformed_image': imgTensor };
		const result = this.featureExtractor.run(feed).then((result) => result['output']);
		this.embeddingMap.set(img.id, result);
	}

	public async tensorToBase64Img(mask: ort.Tensor, imgWidth: number, imgHeight: number): Promise<string> {
		const maskImBuff = await sharp(mask.data as Uint8Array, {
			raw: {
				width: imgWidth, height: imgHeight, channels: 1
			}})
			.jpeg()
			.toBuffer();
		return `data:image/jpeg;base64,${maskImBuff.toString('base64')}`
	}

	public async segmentImage(outputPath: string, mask: ort.Tensor, img: Img, category: Category) {
		const data = await sharp(path.join(category.path, img.path))
			.raw()
			.toBuffer();

		const pixelArray = new Uint8ClampedArray(data.buffer);
		const maskArray = mask.data as Uint8Array;


		const outputImage = new Uint8ClampedArray(img.width * img.height * 4);

		for (let i = 0; i < maskArray.length; i++) {
			const rgbaIdx = i * 4
			const rgbIdx = i * 3
			outputImage[rgbaIdx] = pixelArray[rgbIdx];
			outputImage[rgbaIdx + 1] = pixelArray[rgbIdx + 1];
			outputImage[rgbaIdx + 2] = pixelArray[rgbIdx + 2];
			outputImage[rgbaIdx + 3] = maskArray[i];
		}

		await sharp(outputImage, {
			raw: {
				width: img.width, height: img.height, channels: 4
			}})
			.trim({
				threshold: 5
			})
			.toFile(outputPath)
	}

	public async detectMask(embedding: ort.Tensor, img: Img, points: SegmentationPoint[]): Promise<ort.Tensor> {
		const scale = 1024.0 / Math.max(img.width, img.height);
		const onnx_coord = new Float32Array(2 * points.length + 2);
		const onnx_label = new Float32Array(points.length + 1);
		points.forEach((point, index) => {
			onnx_coord[index * 2] = point.x * scale;
			onnx_coord[index * 2 + 1] = point.y * scale;
			onnx_label[index] = point.type;
		});
		onnx_coord[points.length * 2] = 0;
		onnx_coord[points.length * 2 + 1] = 0;
		onnx_label[points.length] = -1;

		const feed = {
			'extract_segmented_coords': new ort.Tensor('bool', new Uint8Array([0]), [1]),
			'image_embeddings': embedding,
			'point_coords': new ort.Tensor('float32', onnx_coord, [1, points.length + 1, 2]),
			'point_labels': new ort.Tensor('float32', onnx_label, [1, points.length + 1]),
			'mask_input': new ort.Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]),
			'has_mask_input': new ort.Tensor('float32', new Float32Array([0]), [1]),
			'orig_im_size': new ort.Tensor('float32', new Float32Array([img.height, img.width]), [2])
		};
		const result = await this.maskDetector.run(feed);
		return result['im_masks']
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