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
import { MatchingDto, MatchingMethod, MatchingType } from 'shared-lib';
import { projectService } from './project.service';
import {
	Matching,
	matchingImgRecordTbl,
	matchingRecordScoreTbl,
	matchingRecordTbl,
	matchingTbl,
} from '../entities/matching';
import { createReadStream } from 'fs';
import * as csv from '@fast-csv/parse';
import { imageService } from './image.service';
import { configService } from './config.service';
import { Config } from '../entities/user-config-tbl';
import numeric from 'numeric';

class MatchingService {

	public mds(distances: number[][], dimensions = 2) {
		const M = numeric.mul(numeric.pow(distances, 2), -0.5);

		// double centre the rows/columns
		function mean(A: number[][]) {
			return numeric.div(numeric.add.apply(null, A), A.length);
		}
		const rowMeans = mean(M),
			colMeans = mean(numeric.transpose(M)),
			totalMean = mean(rowMeans);

		for (let i = 0; i < M.length; ++i) {
			for (let j =0; j < M[0].length; ++j) {
				M[i][j] += totalMean - rowMeans[i] - colMeans[j];
			}
		}

		// take the SVD of the double centred matrix, and return the
		// points from it
		const ret = numeric.svd(M),
			eigenValues = numeric.sqrt(ret.S);
		return ret.U.map(function(row) {
			return numeric.mul(row, eigenValues).splice(0, dimensions);
		});
	}
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

	public async getMatchingRecordByName(projectPath: string, name: string, matchingId: number) {
		const database = dbService.getConnection(projectPath);
		return database.query.matchingRecordTbl.findFirst({
			where: (matchingRecordTbl, {eq, and}) => (
				and(
					eq(matchingRecordTbl.matchingId, matchingId),
					eq(matchingRecordTbl.name, name)
				)
			)
		});
	}

	public async processSimilarity(projectPath: string, matching: Matching, reply: (current: number, total: number) => Promise<void>): Promise<string[]> {
		const stream = createReadStream(matching.matrixPath)
			.pipe(csv.parse({ headers: true }));

		const recordIdMap = new Map<string, number>();
		const nonMappingCategories : string[] = [];
		const findRecordId = async (recordName: string) => {
			if (recordIdMap.has(recordName)) {
				return new Promise<number>((resolve, _) => resolve(recordIdMap.get(recordName)));
			}
			const matchingRecord = await this.getMatchingRecordByName(projectPath, recordName, matching.id)
			if (matchingRecord) {
				recordIdMap.set(recordName, matchingRecord.id);
			} else {
				const recordId = await database.insert(matchingRecordTbl)
					.values({ name: recordName, matchingId: matching.id })
					.returning({insertedId: matchingRecordTbl.id}).then(takeUniqueOrThrow);

				let imgs;
				if (matching.matchingMethod === MatchingMethod.NAME) {
					imgs = await imageService.findBestMatchByName(projectPath, recordName);
				} else if (matching.matchingMethod === MatchingMethod.PATH) {
					imgs = await imageService.findBestMatchByPath(projectPath, recordName);
				} else {
					throw new Error(`Matching Method ${matching.matchingMethod} is not implemented!`)
				}
				if (imgs.length > 0) {
					await database.insert(matchingImgRecordTbl).values(
						imgs.map(x => ({
							imgId: x.id, matchingRecordId: recordId.insertedId, matchingId: matching.id
						}))
					);
				} else {
					nonMappingCategories.push(recordName);
				}
				recordIdMap.set(recordName, recordId.insertedId);
			}

			return recordIdMap.get(recordName);
		};

		const database = dbService.getConnection(projectPath);
		let count = 0;

		for await (const  row of stream) {
			const srcRecordId = await findRecordId(row[''])
			delete row[''];
			const targetImgs = Array.from(Object.entries(row), ([name, value]) => ({ name, value: parseFloat(value as string) }));
			const sortedTarget = matching.matchingType === MatchingType.DISTANCE
				? targetImgs.sort((a, b) => (a.value - b.value))
				: targetImgs.sort((a, b) => (b.value - a.value))
			const values = [];
			for (let i = 0; i < sortedTarget.length; i++) {
				const targetIm = sortedTarget[i].name;
				let score = sortedTarget[i].value;
				if (matching.matchingType === MatchingType.DISTANCE) {
					score = 1 / (1 + score);
				}

				const targetRecordId = await findRecordId(targetIm);
				values.push({
					sourceId: srcRecordId,
					targetId: targetRecordId,
					matchingId: matching.id,
					score: score,
					rank: i + 1
				});
				if (values.length > 500) {
					await database.insert(matchingRecordScoreTbl).values(values);
					values.length = 0;
				}
			}
			if (values.length > 0) {
				await database.insert(matchingRecordScoreTbl).values(values);
				values.length = 0;
			}


			count += 1;
			await reply( count, sortedTarget.length)
		}

		return nonMappingCategories;
	}


	public async setActivatedMatching(projectPath: string, matchingId: number): Promise<void> {
		return configService.updateConfig(projectPath, Config.ACTIVATED_MATCHING_ID, matchingId.toString());
	}
}

const matchingService = new MatchingService();
export { matchingService };