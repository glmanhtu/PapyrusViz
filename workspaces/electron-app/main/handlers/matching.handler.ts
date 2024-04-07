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
	MatchingResponse,
	MatchingType,
	Progress,
	ThumbnailResponse,
} from 'shared-lib';
import { dbService } from '../services/database.service';
import * as csv from '@fast-csv/parse';
import { createReadStream } from 'fs';
import { matchingImgTbl, matchingTbl } from '../entities/matching';
import { imageService } from '../services/image.service';
import { Message } from 'shared-lib/.dist/models/common';
import { projectService } from '../services/project.service';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { and, eq, SQLWrapper } from 'drizzle-orm';
import { configService } from '../services/config.service';
import { Config } from '../entities/user-config-tbl';
import { categoryTbl } from '../entities/category';
import { imgTbl } from '../entities/img';
import path from 'node:path';


export class MatchingHandler extends BaseHandler {
	constructor() {
		super();
		this.addContinuousRoute('matching::create-matching', this.createMatching.bind(this))
		this.addRoute('matching:get-matchings', this.getMatchings.bind(this))
		this.addRoute('matching:get-activated-matching', this.getActivatedMatching.bind(this))
		this.addRoute('matching:set-activated-matching', this.setActivatedMatching.bind(this))
		this.addRoute('matching:find-matching-imgs', this.findMatchingImages.bind(this))
	}

	private async findMatchingImages(request: MatchingImgRequest): Promise<ThumbnailResponse> {
		const database = dbService.getConnection(request.projectPath);
		const category = await database.select().from(categoryTbl)
			.where(eq(categoryTbl.id, request.categoryId)).then(takeUniqueOrThrow);

		const filters: SQLWrapper[] = [
			eq(matchingImgTbl.matchingId, request.matchingId),
			eq(matchingImgTbl.sourceImgId, request.imgId)
		];
		if (category.path !== '') {
			filters.push(eq(imgTbl.categoryId, request.categoryId))
		}

		const images = database.select().from(matchingImgTbl)
			.leftJoin(imgTbl, eq(matchingImgTbl.targetImgId, imgTbl.id))
			.where((and(...filters)))
			.orderBy(matchingImgTbl.score)
			.limit(request.perPage)
			.offset(request.page * request.perPage);

		return images.then(items => ({
			thumbnails: items.map(x => ({
				imgId: x.img.id, path: "atom://" + path.join(request.projectPath, x.img.thumbnail),
				imgName: x.img.name,
				score: x['matching-img'].score,
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

	private async getActivatedMatching(projectPath: string): Promise<MatchingResponse> {
		const matchingId = await configService.getConfig(projectPath, Config.ACTIVATED_MATCHING_ID, "1")
			.then(x => parseInt(x));
		const database = dbService.getConnection(projectPath);
		return database.select().from(matchingTbl).where(eq(matchingTbl.id, matchingId)).then(takeUniqueOrThrow);
	}

	private async setActivatedMatching(payload: MatchingRequest): Promise<void> {
		return configService.updateConfig(payload.projectPath, Config.ACTIVATED_MATCHING_ID, payload.matchingId.toString());
	}

	private async createMatching(payload: MatchingDto, reply: (message: IMessage<string | Progress>) => Promise<void>): Promise<void> {
		const database = dbService.getConnection(payload.projectPath);
		const project = await projectService.getProjectByPath(payload.projectPath);
		const matching = await database.insert(matchingTbl).values({
			name: payload.matchingName,
			matrixPath: payload.projectPath,
			matchingMethod: payload.matchingMethod,
			matchingType: payload.matchingType,
			projectId: project.id
		}).returning({ insertedId: matchingTbl.id }).then(takeUniqueOrThrow);

		const stream = createReadStream(payload.matchingFile)
			.pipe(csv.parse({ headers: true }));

		const idMap = new Map<string, number>();

		const findImgId = async (imName: string) => {
			if (idMap.has(imName)) {
				return new Promise<number>((resolve, _) => resolve(idMap.get(imName)));
			}
			const img = await imageService.findBestMatch(payload.projectPath, imName);
			idMap.set(imName, img.id);
			return img.id;
		};

		let count = 0;
		for await (const  row of stream) {
			const srcImgId = await findImgId(row['']);
			const values = [];
			for (const [targetIm, distance] of Object.entries(row)) {
				if (targetIm === '') {
					continue;
				}
				let score = parseFloat(distance as string);
				if (payload.matchingType === MatchingType.SIMILARITY) {
					score = 1 - score;
				}
				const targetImgId = await findImgId(targetIm);
				values.push({
					sourceImgId: srcImgId,
					targetImgId: targetImgId,
					score: score,
					matchingId: matching.insertedId
				});
			}
			await database.insert(matchingImgTbl).values(values);
			count += 1;
			await reply(Message.success({ percentage: 100 * count / values.length, title: '', description: ''}))
		}
		await this.setActivatedMatching({projectPath: payload.projectPath, matchingId: matching.insertedId});
	}
}