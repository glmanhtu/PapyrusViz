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

import { dbService } from './database.service';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { MatchingDto, MatchingType } from 'shared-lib';
import { projectService } from './project.service';
import { Matching, matchingImgTbl, matchingTbl } from '../entities/matching';
import { createReadStream } from 'fs';
import * as csv from '@fast-csv/parse';
import { imageService } from './image.service';
import { configService } from './config.service';
import { Config } from '../entities/user-config-tbl';
import { MatchingMethod } from 'shared-lib/.dist/models/matching';

class MatchingService {

	public async createMatching(payload: MatchingDto): Promise<Matching> {
		const database = dbService.getConnection(payload.projectPath);
		const project = await projectService.getProjectByPath(payload.projectPath);
		const matching = await database.insert(matchingTbl).values({
			name: payload.matchingName,
			matrixPath: payload.matchingFile,
			matchingMethod: payload.matchingMethod,
			matchingType: payload.matchingType,
			projectId: project.id
		}).returning({ insertedId: matchingTbl.id }).then(takeUniqueOrThrow);

		return database.query.matchingTbl.findFirst({ where: (matchingTbl, { eq }) => (
				eq(matchingTbl.id, matching.insertedId)
		)});
	}
	public async processSimilarity(projectPath: string, matching: Matching, reply: (current: number, total: number) => Promise<void>): Promise<string[]> {
		const stream = createReadStream(matching.matrixPath)
			.pipe(csv.parse({ headers: true }));

		const idMap = new Map<string, number>();

		const findImgId = async (imName: string) => {
			if (idMap.has(imName)) {
				return new Promise<number>((resolve, _) => resolve(idMap.get(imName)));
			}
			let img;
			if (matching.matchingMethod === MatchingMethod.NAME) {
				img = await imageService.findBestMatchByName(projectPath, imName);
			} else if (matching.matchingMethod === MatchingMethod.PATH) {
				img = await imageService.findBestMatchByPath(projectPath, imName);
			} else {
				throw new Error(`Matching Method ${matching.matchingMethod} is not implemented!`)
			}
			if (img.length > 0) {
				idMap.set(imName, img[0].id);
				return img[0].id;
			}
			idMap.set(imName, undefined);
			return undefined;
		};

		const database = dbService.getConnection(projectPath);
		let count = 0;
		const nonMappingCategories = [];
		for await (const  row of stream) {
			const srcImgId = await findImgId(row['']);
			const values = [];
			for (const [targetIm, distance] of Object.entries(row)) {
				if (targetIm === '') {
					continue;
				}
				let score = parseFloat(distance as string);
				if (matching.matchingType === MatchingType.DISTANCE) {
					score = 1 / (1 + score);
				}
				const targetImgId = await findImgId(targetIm);
				if (targetImgId !== undefined) {
					values.push({
						sourceImgId: srcImgId,
						targetImgId: targetImgId,
						score: score,
						matchingId: matching.id,
						rank: 0
					});
				} else {
					nonMappingCategories.push(targetIm)
				}
			}

			// Sort the records based on score
			const sortedValues = values.sort((a, b) => (b.score - a.score))
			let rank = 1;
			for (let i = 0; i < values.length; i++) {
				if (i > 0 && sortedValues[i].score < sortedValues[i - 1].score) {
					rank += 1
				}
				sortedValues[i].rank = rank
			}
			await database.insert(matchingImgTbl).values(sortedValues);
			count += 1;
			await reply( count, values.length)
		}
		return nonMappingCategories;
	}

	public async setActivatedMatching(projectPath: string, matchingId: number): Promise<void> {
		return configService.updateConfig(projectPath, Config.ACTIVATED_MATCHING_ID, matchingId.toString());
	}
}

const matchingService = new MatchingService();
export { matchingService };