import { BaseHandler } from "./base.handler";

import { IMessage, MatchingDto, Progress } from 'shared-lib';
import { dbService } from '../services/database.service';
import * as csv from '@fast-csv/parse';
import { createReadStream } from 'fs';
import { matchingImgTbl, matchingTbl } from '../entities/matching';
import { imageService } from '../services/image.service';
import { Message } from 'shared-lib/.dist/models/common';
import { projectService } from '../services/project.service';
import { takeUniqueOrThrow } from '../utils/data.utils';


export class MatchingHandler extends BaseHandler {
	constructor() {
		super();
		this.addContinuousRoute('matching::create-matching', this.createMatching.bind(this))
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
				const targetImgId = await findImgId(targetIm);
				values.push({
					sourceImgId: srcImgId,
					targetImgId: targetImgId,
					score: parseFloat(distance as string),
					matchingId: matching.insertedId
				});
			}
			await database.insert(matchingImgTbl).values(values);
			count += 1;
			await reply(Message.success({ percentage: 100 * count / values.length, title: '', description: ''}))
		}
	}
}