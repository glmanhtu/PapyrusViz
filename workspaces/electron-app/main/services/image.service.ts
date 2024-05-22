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
import url from 'node:url';
import sharp from 'sharp';
import { eq, like, or } from 'drizzle-orm';
import { dbService } from './database.service';
import { GlobalConfig, ImgDto, SegmentationPoint } from 'shared-lib';
import * as ort from 'onnxruntime-node';
import * as pathUtils from '../utils/path.utils';
import { EmbeddingInfo } from '../models/utils';
import { promises as fs } from 'fs';
import { Logger } from '../utils/logger';

declare const global: GlobalConfig;

class ImageService {

	private featureExtractor: ort.InferenceSession;
	private maskDetector: ort.InferenceSession;

	private embeddingMap = new Map<number, Promise<EmbeddingInfo>>();
	private embeddingImIdx: number[] = [];

	public async getEmbedding(imgId: number): Promise<EmbeddingInfo> {
		return this.embeddingMap.get(imgId);
	}

	private setEmbedding(imgId: number, embedding: Promise<EmbeddingInfo>) {
		this.embeddingImIdx.push(imgId);
		if (this.embeddingImIdx.length > 50) {
			// We keep maximum of 50 images in memory to avoid out of memory
			const toDelete = this.embeddingImIdx.shift();
			this.embeddingMap.delete(toDelete);
		}
		this.embeddingMap.set(imgId, embedding);
	}

	constructor() {
		const options = { intraOpNumThreads: 1, enableCpuMemArena: false };
		ort.InferenceSession.create(pathUtils.fromResource('ml-models', 'mobile_sam_preprocess.onnx'), options).then((session: ort.InferenceSession) => {
			this.featureExtractor = session;
			Logger.info("Mobile SAM preprocessor loaded");
		});
		ort.InferenceSession.create(pathUtils.fromResource('ml-models', 'mobile_sam.onnx'), options).then((session: ort.InferenceSession) => {
			this.maskDetector = session;
			Logger.info("Mobile SAM loaded");
		});
	}

	public resolveImgUri(category: Category, img: Img | ImgDto): ImgDto {
		return {
			...img,
			path: pathUtils.replaceProtocol(url.pathToFileURL(path.join(category.path, img.path)).toString(), 'file://', 'atom://'),
			fragment: img.fragment !== ''
				? pathUtils.replaceProtocol(url.pathToFileURL(pathUtils.segmentationPath(category, img as Img)).toString(), 'file://', 'atom://')
				: '',
			thumbnail: this.resolveThumbnailUri(category, img)
		}
	}

	public resolveThumbnailUri(category: Category, img: Img | ImgDto): string {
		let imgPath = path.join(category.path, img.path)
		if (img.fragment !== '') {
			imgPath = pathUtils.segmentationPath(category, img as Img)
		}
		return pathUtils.replaceProtocol(url.pathToFileURL(this.resolveThumbnailFromImgPath(imgPath)).toString(), 'file://', 'atom://');
	}

	public resolveThumbnailFromImgPath(imgPath: string) {
		const components = path.parse(imgPath);
		const thumbnailName = components.name + '.jpg';
		const basePath = components.dir.replace(components.root, '');
		return pathUtils.fromAppData('thumbnails', basePath, thumbnailName);
	}

	public async updateThumbnail(img: Img, category: Category, newImgPath: string) {
		const oldThumbnailPath = imageService.resolveThumbnailFromImgPath(path.join(category.path, img.path));
		if (pathUtils.exists(oldThumbnailPath)) {
			const newThumbnailPath = imageService.resolveThumbnailFromImgPath(newImgPath);
			if (!pathUtils.exists(path.dirname(newThumbnailPath))) {
				await fs.mkdir(path.dirname(newThumbnailPath), {recursive: true})
			}
			await fs.rename(oldThumbnailPath, newThumbnailPath)
		} else {
			await imageService.generateThumbnail(newImgPath);
		}
	}

	public async updateSegmentedImg(img: Img, category: Category, oldSegmentationImg: string) {
		if (img.fragment === '') {
			return;
		}
		const segmentationPath = pathUtils.segmentationPath(category, img);
		if (pathUtils.exists(oldSegmentationImg)) {
			if (!pathUtils.exists(path.dirname(segmentationPath))) {
				await fs.mkdir(path.dirname(segmentationPath), {recursive: true})
			}
			await fs.rename(oldSegmentationImg, segmentationPath);
		} else {
			await this.registerImageFeatures(img, category);
			const embeddings = await this.getEmbedding(img.id);
			const result = await this.detectMask(embeddings, img.segmentationPoints);
			await fs.mkdir(path.dirname(segmentationPath), {recursive: true})
			img.width = embeddings.width;
			img.height = embeddings.height;
			await this.segmentImage(segmentationPath, result, img, category);
		}

		const oldThumbnailPath = this.resolveThumbnailFromImgPath(oldSegmentationImg);
		const thumbnailPath = this.resolveThumbnailFromImgPath(segmentationPath);
		if (pathUtils.exists(oldThumbnailPath)) {
			if (!pathUtils.exists(path.dirname(thumbnailPath))) {
				await fs.mkdir(path.dirname(thumbnailPath), {recursive: true})
			}
			await fs.rename(oldThumbnailPath, thumbnailPath);
		} else {
			await imageService.generateThumbnail(segmentationPath)
		}
	}

	public resolveImgPath(category: Category, img: Img | ImgDto): string {
		return path.join(category.path, img.path);
	}

	public async registerImageFeatures(img: Img, category: Category): Promise<void> {
		const originalImg = sharp(path.join(category.path, img.path));
		const metadata = await originalImg.metadata();
		const scale = 1024.0 / Math.max(metadata.width, metadata.height);
		const width = Math.round(metadata.width * scale);
		const height = Math.round(metadata.height * scale);
		const data = await originalImg
			.resize({ width: width, height: height })
			.flatten({ background: { r: 255, g: 255, b: 255 } })
			.raw()
			.toBuffer();

		const pixelArray = new Uint8ClampedArray(data.buffer);
		const imgTensor = new ort.Tensor('uint8', new Uint8Array(pixelArray.buffer), [1, height, width, 3]);
		const feed = { 'transformed_image': imgTensor };
		const result = this.featureExtractor.run(feed)
			.then((result) => ({
				embedding: result['output'],
				width: metadata.width,
				height: metadata.height,
				scale: scale
			}));
		this.setEmbedding(img.id, result);
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

	public async generateThumbnail(imgPath: string, force = false) {
		const thumbnailPath = this.resolveThumbnailFromImgPath(imgPath);

		if (!force && await pathUtils.isFile(thumbnailPath)) {
			return thumbnailPath;
		}
		await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
		await this.resize(imgPath, thumbnailPath, undefined, global.appConfig.thumbnailImgSize);
		return thumbnailPath;
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
			.toFile(outputPath);

		return await sharp(outputPath).metadata();
	}

	public async detectMask(embedding: EmbeddingInfo, points: SegmentationPoint[]): Promise<ort.Tensor> {
		const onnx_coord = new Float32Array(2 * points.length + 2);
		const onnx_label = new Float32Array(points.length + 1);
		points.forEach((point, index) => {
			onnx_coord[index * 2] = point.x * embedding.scale;
			onnx_coord[index * 2 + 1] = point.y * embedding.scale;
			onnx_label[index] = point.type;
		});
		onnx_coord[points.length * 2] = 0;
		onnx_coord[points.length * 2 + 1] = 0;
		onnx_label[points.length] = -1;

		const feed = {
			'image_embeddings': embedding.embedding,
			'point_coords': new ort.Tensor('float32', onnx_coord, [1, points.length + 1, 2]),
			'point_labels': new ort.Tensor('float32', onnx_label, [1, points.length + 1]),
			'mask_input': new ort.Tensor('float32', new Float32Array(256 * 256), [1, 1, 256, 256]),
			'has_mask_input': new ort.Tensor('float32', new Float32Array([0]), [1]),
			'orig_im_size': new ort.Tensor('float32', new Float32Array([embedding.height, embedding.width]), [2])
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