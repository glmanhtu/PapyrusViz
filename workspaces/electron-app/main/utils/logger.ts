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

import { app } from 'electron';
import * as os from 'node:os';
import * as path from 'node:path';
import * as winston from 'winston';
import { GlobalConfig } from 'shared-lib';
import * as pathUtils from '../utils/path.utils';


declare const global: GlobalConfig;


export class Logger {
	private static singleton: Logger;
	private _logger: winston.Logger;

	public static error(message: string, ...meta: any[]): void {
		Logger.initSingleton();
		Logger.singleton._logger.error(message, meta);
	}

	public static warn(message: string, ...meta: any[]): void {
		Logger.initSingleton();
		Logger.singleton._logger.warn(message, meta);
	}

	public static info(message: string, ...meta: any[]): void {
		Logger.initSingleton();
		Logger.singleton._logger.info(message, meta);
	}

	public static http(message: string, ...meta: any[]): void {
		Logger.initSingleton();
		Logger.singleton._logger.http(message, meta);
	}

	public static verbose(message: string, ...meta: any[]): void {
		Logger.initSingleton();
		Logger.singleton._logger.verbose(message, meta);
	}

	public static debug(message: string, ...meta: any[]): void {
		Logger.initSingleton();
		Logger.singleton._logger.debug(message, meta);
	}

	public static silly(message: string, ...meta: any[]): void {
		Logger.initSingleton();
		Logger.singleton._logger.silly(message, meta);
	}

	private static initSingleton(): void {
		if (!Logger.singleton) {
			Logger.singleton = new Logger();
		}
	}

	private constructor() {
		const formats = [
			winston.format.errors({stack: true}),
			winston.format.timestamp({format: "YYYY-MM-DD HH:mm:ss.SSS"}),
			winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label', 'service', 'stack'] }),
			winston.format.printf((info) => {
				let text = `${info.timestamp} ${info.level.toUpperCase()} [${info.service}]: ${info.message}`;
				if (info.metadata) {
					for (const key in info.metadata) {
						const obj = info.metadata[key];
						if (obj.stack)  {
							text = `${text} ${obj.stack}\n`;
						} else {
					 		text = `${text} ${JSON.stringify(obj, null, 2)} \n`;
						}
					}
				}
				return text;
			}),
		];

		const transports: winston.transport[] = [];
		transports.push(new winston.transports.File({
			filename: this.getLogFilename(),
			level: global.appConfig.mainLogLevel,
		}));

		// If we're not in production then log also to the `console` with the format:
		if (global.appConfig.configId === 'development') {
			formats.push(winston.format.colorize());

			transports.push(new winston.transports.Console({
					stderrLevels: ['error', 'warn'],
			}));
		}

		this._logger = winston.createLogger({
			level: 'debug',
			format: winston.format.combine(...formats),
			defaultMeta: { service: 'user-service' },
			transports: transports,
		});

	}

	/**
	 * Returns log filename with standard path
	 * In production, returns absolute standard path depending on platform
	 */
	private getLogFilename() {
		let filename = global.appConfig.mainLogFile;
		if (global.appConfig.configId === 'production') {
			const appName = app.getName();
			if (process.platform == 'linux') {
				filename = `.config/${appName}/${filename}`;
			} else if (process.platform == 'darwin') {
				filename = `Library/Logs/${appName}/${filename}`;
			} else if (process.platform == 'win32') {
				filename = `AppData\\Roaming\\${appName}\\${filename}`;
			}
			return path.join(os.homedir(), filename);
		}
		return pathUtils.fromRoot('logs', filename);
	}

}
