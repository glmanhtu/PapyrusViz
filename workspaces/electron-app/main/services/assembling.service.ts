import { Config } from '../entities/user-config-tbl';
import { and, eq } from 'drizzle-orm';
import { dbService } from './database.service';
import { Img } from '../entities/img';
import { imgAssemblingTbl } from '../entities/img-assembling';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { AssemblingImage, Transforms } from 'shared-lib';
import { configService } from './config.service';

class AssemblingService {

	public async updateActivatedAssembling(projectPath: string, assemblingId: number): Promise<void> {
		await configService.updateConfig(projectPath, Config.ACTIVATED_ASSEMBLING_ID, assemblingId.toString());
	}

	public async getActivatedAssembling(projectPath: string): Promise<number> {
		return await configService.getConfig(projectPath, Config.ACTIVATED_ASSEMBLING_ID, "1")
			.then(x => parseInt(x))
	}

	public async deleteAssembledImage(projectPath: string, assemblingId: number, img: Img): Promise<void> {
		const database = dbService.getConnection(projectPath);
		await database.delete(imgAssemblingTbl)
				.where(and(eq(imgAssemblingTbl.assemblingId, assemblingId), eq(imgAssemblingTbl.imgId, img.id)));
  }

	public async swapAssembledImage(projectPath: string, assemblingId: number, fromImg: Img, toImg: Img) : Promise<AssemblingImage> {
		const database = dbService.getConnection(projectPath);
		const imgAssembling = await database.select().from(imgAssemblingTbl)
			.where(and(eq(imgAssemblingTbl.assemblingId, assemblingId), eq(imgAssemblingTbl.imgId, fromImg.id)))
			.then(takeUniqueOrThrow);
		const transforms = imgAssembling.transforms as Transforms
		transforms.scale = (transforms.scale * fromImg.width) / toImg.width
		await database.update(imgAssemblingTbl).set({imgId: toImg.id, transforms: transforms})
			.where(and(eq(imgAssemblingTbl.assemblingId, assemblingId), eq(imgAssemblingTbl.imgId, fromImg.id)));
		return { img: toImg, transforms: transforms }
	}
}

const assemblingService = new AssemblingService();
export { assemblingService };