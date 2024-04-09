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
	IMessage,
	MatchingDto,
	MatchingImgRequest,
	MatchingRequest,
	MatchingResponse, Message,
	Progress,
	ThumbnailResponse,
} from 'shared-lib';
import { dbService } from '../services/database.service';
import { matchingImgTbl, matchingTbl } from '../entities/matching';
import { projectService } from '../services/project.service';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { and, eq } from 'drizzle-orm';
import { configService } from '../services/config.service';
import { Config } from '../entities/user-config-tbl';
import { categoryTbl } from '../entities/category';
import { imgTbl } from '../entities/img';
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
		this.addRoute('matching:find-matching-imgs', this.findMatchingImages.bind(this))
	}

	private async findMatchingImages(request: MatchingImgRequest): Promise<ThumbnailResponse> {
		const database = dbService.getConnection(request.projectPath);
		const category = await database.select().from(categoryTbl)
			.where(eq(categoryTbl.id, request.categoryId)).then(takeUniqueOrThrow);

		const images = database.select().from(matchingImgTbl)
			.where(and(
				eq(matchingImgTbl.matchingId, request.matchingId),
				eq(matchingImgTbl.sourceImgId, request.imgId),
				category.path !== ''
					? eq(imgTbl.categoryId, request.categoryId)
					: undefined
			))

			.innerJoin(imgTbl, eq(matchingImgTbl.targetImgId, imgTbl.id))
			.orderBy(matchingImgTbl.score)
			.limit(request.perPage)
			.offset(request.page * request.perPage);

		// const images = database.query.matchingImgTbl.findMany({
		// 	limit: request.perPage,
		// 	offset: request.page * request.perPage,
		// 	orderBy: [asc(matchingImgTbl.score)],
		// 	where: (matchingImgTbl, { eq, and }) => (
		// 		and(
		// 			eq(matchingImgTbl.matchingId, request.matchingId),
		// 			eq(matchingImgTbl.sourceImgId, request.imgId),
		// 		)
		// 	),
		// 	with: {
		// 		targetImg: true
		// 	}
		// })


		return images.then(items => ({
			thumbnails: items.map(x => ({
				imgId: x.img.id, path: "atom://" + path.join(request.projectPath, x.img.thumbnail),
				imgName: x.img.name,
				score: x['matching-img'].score,
				rank: x['matching-img'].rank,
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

	private async deleteMatching(matchingRequest: MatchingRequest): Promise<void> {
		const database = dbService.getConnection(matchingRequest.projectPath);
		await database.delete(matchingImgTbl).where(eq(matchingImgTbl.matchingId, matchingRequest.matchingId));
		await database.delete(matchingTbl).where(eq(matchingTbl.id, matchingRequest.matchingId));
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
		await matchingService.processSimilarity(payload.projectPath, matching, async (current, total) => {
			await reply(Message.success({
				percentage: 100 * current / total, title: 'Create matching...',
				description: `Created ${current} / ${total} similarity matching...`
			}));
		})
		await this.setActivatedMatching({projectPath: payload.projectPath, matchingId: matching.id});
	}
}