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