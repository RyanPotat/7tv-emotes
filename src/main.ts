import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Postgres } from './database/Postgres.js';
import { RedisClient } from './database/Redis.js';
import { Logger } from './utility/Logger.js';
import { ChatClient } from './services/TwitchClient.js';
import { WebsocketServer } from './manager/WebSocketManager.js';
import { ChannelEmoteManager } from './manager/ChannelEmoteManager.js';
import { Cronjob } from './utility/Cronjob.js';
import { IVR } from './services/IVR.js';
import { EmoteHandler } from './handler/EmoteHandler.js';
import { GlobalClasses } from './types/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, 'config.json');

let Bot = global.Bot = {} as GlobalClasses;

// @ts-expect-error CBA to fix top level await in tsconfig
Bot.Config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
Bot.Logger = Logger.New();
Bot.Twitch = new ChatClient();
Bot.Redis = RedisClient.New();
Bot.WS = new WebsocketServer(Bot.Config.WS.port);
Bot.Cronjob = Cronjob.New();
Bot.EmoteHandler = EmoteHandler.New();

/**
 * Disabled until i get gud
 * // @ts-ignore
 * Bot.EventAPI = EventAPI.New();
 */

(async () => {
	await Postgres.Setup();

	Bot.SQL = Postgres.New();
	await Bot.SQL.CreateTables();

	await import('./api/index.js');

	process.on('SIGINT', async () => {
		await Bot.Redis.delAll();
		Bot.Logger.Warn('Shutting down...');
		process.exit();
	});

	process.once('SIGUSR2', async () => {
		await Bot.Redis.delAll();
		Bot.Logger.Warn('Shutting down...');
		process.kill(process.pid, 'SIGUSR2');
	});

	async function Init() {
		for (const channelId of Bot.Config.Admins) {
			try {
				const data = await IVR(channelId, true);
				if (data) Bot.Twitch.Join(data.login);
			} catch (e) {
				Bot.Logger.Error(`Failed to join admin channel: ${channelId}`);
			}
		}

		const { result, length } = await Bot.SQL.GetChannelsArray();
		let perfomanceTime: number = performance.now();
		let { count } = await ChannelEmoteManager(result);

		let tookTime = performance.now() - perfomanceTime;
		Bot.Logger.Log(`Emotes updated for ${count}/${length} channels, took ${tookTime}ms`);
	}

	await Init();
	Bot.Cronjob.Schedule('*/30 * * * *', async () => {
		await Init();
	});
})();
