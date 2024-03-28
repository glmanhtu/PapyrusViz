import { BaseHandler } from "./base.handler";
import { IMessage, Message, Progress, ProjectDTO } from 'shared-lib';
import * as fs from 'fs';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { projects } from '../entities/project';

export class ProjectHandler extends BaseHandler {
	constructor(private database: BetterSQLite3Database) {
		super();
		this.addContinuousHandler<ProjectDTO, Progress>('project::create-project', this.creteProject.bind(this));
	}

	private async creteProject(payload: ProjectDTO, reply: (message: IMessage<string | Progress>) => void ): Promise<void> {
		const isProjPathExists = fs.existsSync(payload.path) && fs.lstatSync(payload.path).isDirectory();
		const isDSPathExists = fs.existsSync(payload.dataPath) && fs.lstatSync(payload.dataPath).isDirectory();
		if (isProjPathExists &&  fs.readdirSync(payload.path).length !== 0) {
			reply(Message.error(`Project location: ${payload.path} is not empty!`));
		}
		if (isDSPathExists) {
			reply(Message.error(`Dataset location: ${payload.dataPath} doesn't exists!`));
		}
		reply(Message.success({
			percentage: 0, title: 'Step 1/3 - Creating project', description: 'Writing project information...'
		}));
		if (!isProjPathExists) {
			fs.mkdirSync(payload.path);
		}
		this.database.insert(projects).values({

		})
	}
}