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

import { BaseHandler } from './base.handler';

import {
	IMessage, Link,
	MatchingDto,
	MatchingImgRequest,
	MatchingRequest,
	MatchingResponse, Message,
	Progress, SimilarityRequest,
	ThumbnailResponse,
} from 'shared-lib';
import { dbService } from '../services/database.service';
import {
	matchingImgRecordTbl,
	matchingRecordScoreTbl,
	matchingRecordTbl,
	matchingTbl,
} from '../entities/matching';
import { projectService } from '../services/project.service';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { and, eq, gt, lt } from 'drizzle-orm';
import { configService } from '../services/config.service';
import { Config } from '../entities/user-config-tbl';
import { categoryTbl, DefaultCategory } from '../entities/category';
import { ImgStatus, imgTbl } from '../entities/img';
import path from 'node:path';
import { matchingService } from '../services/matching.service';

export class MatchingHandler extends BaseHandler {
	constructor() {
		super();
		this.addContinuousRoute('matching::create-matching', this.createMatching.bind(this))
		this.addRoute('matching:get-matchings', this.getMatchings.bind(this))
		this.addRoute('matching:get-activated-matching', this.getActivatedMatching.bind(this))
		this.addRoute('matching:set-activated-matching', this.setActivatedMatching.bind(this))
		this.addRoute('matching:delete-matching', this.deleteMatching.bind(this))
		this.addRoute('matching:fetch-similarity', this.fetchSimilarities.bind(this))
		this.addRoute('matching:find-matching-imgs', this.findMatchingImages.bind(this))
	}

	private async fetchSimilarities(request: SimilarityRequest): Promise<Link[]> {
		const database = dbService.getConnection(request.projectPath);
		return database.select().from(matchingRecordScoreTbl)
			.where(
				and(
					eq(matchingRecordScoreTbl.matchingId, request.matchingId),
					// For each pair of image, we have an original version and reverse version of it in this table
					// Hence, we need to filter them before return the results
					lt(matchingRecordScoreTbl.sourceId, matchingRecordScoreTbl.targetId),
					gt(matchingRecordScoreTbl.score, request.similarity - 0.000001)
				)
			)
			.then(items => items.map(x => (
				{ source: "" + x.sourceId, target: "" + x.targetId, similarity: x.score }
			)));
	}

	private async findMatchingImages(request: MatchingImgRequest): Promise<ThumbnailResponse> {
		const database = dbService.getConnection(request.projectPath);
		const category = await database.select().from(categoryTbl)
			.where(eq(categoryTbl.id, request.categoryId)).then(takeUniqueOrThrow);

		const sourceRecord = await database.select().from(matchingImgRecordTbl)
			.where(
				and(
					eq(matchingImgRecordTbl.imgId, request.imgId),
					eq(matchingImgRecordTbl.matchingId, request.matchingId)
				)
			)
			.then(takeUniqueOrThrow);

		const images = database.select().from(matchingRecordScoreTbl)
			.where(and(
				eq(matchingRecordScoreTbl.sourceId, sourceRecord.matchingRecordId),
				category.path !== ''
					? eq(imgTbl.categoryId, request.categoryId)
					: undefined,
				category.name === DefaultCategory.ARCHIVED
					? eq(imgTbl.status, ImgStatus.ARCHIVED)
					: eq(imgTbl.status, ImgStatus.ONLINE)
			))
			.innerJoin(matchingRecordTbl, eq(matchingRecordScoreTbl.targetId, matchingRecordTbl.id))
			.innerJoin(matchingImgRecordTbl, eq(matchingImgRecordTbl.matchingRecordId, matchingRecordTbl.id))
			.innerJoin(imgTbl, eq(matchingImgRecordTbl.imgId, imgTbl.id))
			.orderBy(matchingRecordScoreTbl.rank)
			.limit(request.perPage)
			.offset(request.page * request.perPage);


		return images.then(items => ({
			thumbnails: items.map(x => ({
				imgId: x.img.id, path: "atom://" + path.join(request.projectPath, x.img.thumbnail),
				imgName: x.img.name,
				score: x['matching-record-score'].score,
				rank: x['matching-record-score'].rank,
				orgImgWidth: x.img.width,
				orgImgHeight: x.img.height
			}))
		}));
	}

	private async getMatchings(projectPath: string): Promise<MatchingResponse[]> {
		const database = dbService.getConnection(projectPath);
		const project = await projectService.getProjectByPath(projectPath);
		return database.select().from(matchingTbl).where(eq(matchingTbl.projectId, project.id));
	}

	private async deleteMatching(request: MatchingRequest): Promise<void> {
		const database = dbService.getConnection(request.projectPath);
		await database.delete(matchingRecordScoreTbl).where(eq(matchingRecordScoreTbl.matchingId, request.matchingId));
		await database.delete(matchingImgRecordTbl).where(eq(matchingImgRecordTbl.matchingId, request.matchingId));
		await database.delete(matchingRecordTbl).where(eq(matchingRecordTbl.matchingId, request.matchingId));
		await database.delete(matchingTbl).where(eq(matchingTbl.id, request.matchingId));
	}

	private async getActivatedMatching(projectPath: string): Promise<MatchingResponse> {
		const matchingId = await configService.getConfig(projectPath, Config.ACTIVATED_MATCHING_ID, "1")
			.then(x => parseInt(x));
		const database = dbService.getConnection(projectPath);
		return database.query.matchingTbl.findFirst({ where: (matchingTbl, { eq }) => (eq(matchingTbl.id, matchingId))})
	}

	private async setActivatedMatching(payload: MatchingRequest): Promise<void> {
		return matchingService.setActivatedMatching(payload.projectPath, payload.matchingId);
	}

	private async createMatching(payload: MatchingDto, reply: (message: IMessage<string | Progress>) => Promise<void>): Promise<void> {
		const matching = await matchingService.createMatching(payload)
		const nonMappingCols = await matchingService.processSimilarity(payload.projectPath, matching, async (current, total) => {
			await reply(Message.success({
				percentage: 100 * current / total, title: 'Create matching...',
				description: `Created ${current} / ${total} similarity matching...`
			}));
		})
		for (const colName of nonMappingCols) {
			await reply(Message.warning(`Unable to find any image that match with column: '${colName}'`))
		}
		await this.setActivatedMatching({projectPath: payload.projectPath, matchingId: matching.id});
	}
}