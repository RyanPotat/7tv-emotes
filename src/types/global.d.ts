import { Config } from './types';

declare global {
	var Bot: {
		Config: Config;
		Twitch: import('../services/TwitchClient').ChatClient;
		SQL: import('../database/Postgres').Postgres;
		Redis: import('../database/Redis').RedisClient;
		Logger: import('../utility/Logger').Logger;
		EventAPI: import('../services/EventAPI').EventAPI;
		WS: import('../manager/WebSocketManager').WebsocketServer;
		Cronjob: import('../utility/Cronjob').Cronjob;
	};
}

export {};
