import { Config } from './types';

declare global {
	var Bot: {
		Config: Config;
		Twitch: import('../services/TwitchClient').ChatClient;
		SQL: import('../database/Postgres').Postgres;
		Redis: import('../database/Redis').RedisClient;
		Logger: import('../utility/Logger').Logger;
		/**
		 * EventAPI: import("./services/EventAPI").EventAPI;
		 * I'll probably need to rewrite this, i've tried EventAPI in the past and it just seems a better option to use REST
		 */
		WS: import('../manager/WebSocketManager').Websocket;
		Cronjob: import('../utility/Cronjob').Cronjob;
	};
}

export {};
