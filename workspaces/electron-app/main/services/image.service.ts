import { Category } from '../entities/category';
import { Img, imgTbl } from '../entities/img';
import path from 'node:path';
import { ImgDto } from 'shared-lib/.dist/models/img';
import sharp from 'sharp';
import { like } from 'drizzle-orm';
import { dbService } from './database.service';
import { takeFirstOrThrow } from '../utils/data.utils';

class ImageService {

	public resolveImg(category: Category, img: Img | ImgDto): Img | ImgDto {
		return {
			...img,
			path: 'atom://' + path.join(category.path, img.path)
		}
	}

	public async findBestMatch(projectPath: string, name: string): Promise<Img> {
		const database = dbService.getConnection(projectPath);
		return database.select()
			.from(imgTbl).where(like(imgTbl.name, '%' + name + '%'))
			.orderBy(imgTbl.name)
			.then(takeFirstOrThrow);
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