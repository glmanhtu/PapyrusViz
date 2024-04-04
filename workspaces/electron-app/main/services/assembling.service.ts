import { Config, userConfigTbl } from '../entities/user-config-tbl';
import { and, eq } from 'drizzle-orm';
import { dbService } from './database.service';
import { Img } from '../entities/img';
import { imgAssemblingTbl } from '../entities/img-assembling';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { AssemblingImage, Transforms } from 'shared-lib';

class AssemblingService {

	public async updateActivatedAssembling(projectPath: string, assemblingId: number): Promise<void> {
		const database = dbService.getConnection(projectPath);
		await database.insert(userConfigTbl)
			.values({
				key: Config.ACTIVATED_ASSEMBLING_ID,
				value: assemblingId.toString(),
			})
			.onConflictDoUpdate({
				target: userConfigTbl.key,
				set: {
					value: assemblingId.toString()
				},
				where: eq(userConfigTbl.key, Config.ACTIVATED_ASSEMBLING_ID)
			})
	}

	public async getActivatedAssembling(projectPath: string): Promise<number> {
		const database = dbService.getConnection(projectPath);
		const result = await database.select()
			.from(userConfigTbl)
			.where(eq(userConfigTbl.key, Config.ACTIVATED_ASSEMBLING_ID));
		if (result.length > 0) {
			return parseInt(result[0].value);
		}
		return 0;
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