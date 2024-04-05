import { Config, userConfigTbl } from '../entities/user-config-tbl';
import { eq } from 'drizzle-orm';
import { dbService } from './database.service';

class ConfigService {

	public async updateConfig(projectPath: string, key: Config, value: string): Promise<void> {
		const database = dbService.getConnection(projectPath);
		await database.insert(userConfigTbl)
			.values({
				key: key,
				value: value,
			})
			.onConflictDoUpdate({
				target: userConfigTbl.key,
				set: {
					value: value
				},
				where: eq(userConfigTbl.key, key)
			})
	}

	public async getConfig(projectPath: string, key: Config, defaultValue: string = null): Promise<string> {
		const database = dbService.getConnection(projectPath);
		const result = await database.select()
			.from(userConfigTbl)
			.where(eq(userConfigTbl.key, key));
		if (result.length > 0) {
			return result[0].value;
		}
		return defaultValue;
	}
}

const configService = new ConfigService();
export { configService };