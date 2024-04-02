import { Config, userConfigTbl } from '../entities/user-config-tbl';
import { eq } from 'drizzle-orm';
import { dbService } from './database.service';

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
}

const assemblingService = new AssemblingService();
export { assemblingService };