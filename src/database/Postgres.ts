import pkg, { QueryResult } from 'pg';
import type { NewEmote, UpdateEmote } from '../types/types.js';
import type { IChannel } from '../types/index.js';
import { GetUserLogin } from '../services/TwtichGQL.js';

interface IPool extends pkg.Pool {}

export class Postgres {
	private static _instance: Postgres;
	private _pool: IPool;

	private constructor() {
		this._pool = new pkg.Pool({
			...Bot.Config.Postgres,
		});

		this._pool.on('error', (err) => {
			Bot.Logger.Error(err);
		});
	}

	static New(): Postgres {
		if (!this._instance) {
			this._instance = new Postgres();
		}

		return this._instance;
	}

	async Query(query: string, values?: any[]): Promise<QueryResult<any>> {
		return this._pool.query(query, values);
	}

	async End(): Promise<void> {
		await this._pool.end();
	}

	static async Setup(): Promise<void> {
		const client = new pkg.Pool({
			password: Bot.Config.Postgres.password,
			user: Bot.Config.Postgres.user,
			host: Bot.Config.Postgres.host,
			port: Bot.Config.Postgres.port,
		});

		const db = Bot.Config.Postgres.database;
		const checkDbQuery = `SELECT datname FROM pg_catalog.pg_database WHERE datname = '${db}'`;
		const res = await client.query(checkDbQuery);

		if (res.rowCount === 0) {
			Bot.Logger.Warn(`Database ${db} does not exist, creating...`);
			const createDbQuery = `CREATE DATABASE ${db}`;
			await client.query(createDbQuery);

			Bot.Logger.Log(`Database ${db} created`);
		}

		await client.end();
	}

	async CreateTables(): Promise<void> {
		await this.Query(`CREATE TABLE IF NOT EXISTS channels (
			id SERIAL PRIMARY KEY,
			twitch_username TEXT NOT NULL,
			twitch_id VARCHAR(30) NOT NULL UNIQUE,
			stv_id VARCHAR(30) NOT NULL UNIQUE,
			current_stv_set VARCHAR(30) NOT NULL UNIQUE,
			tracking_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
			tracking BOOLEAN DEFAULT TRUE NOT NULL
		)`);

		await this.Query(`CREATE TABLE IF NOT EXISTS emotes (
			twitch_id VARCHAR(30) NOT NULL,
			emote TEXT NOT NULL,
			emote_alias TEXT,
			emote_id TEXT NOT NULL,
			emote_count INTEGER DEFAULT 0 NOT NULL,
			added TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
			UNIQUE (twitch_id, emote_id),
			FOREIGN KEY (twitch_id) REFERENCES channels(twitch_id) ON DELETE CASCADE
		)`);
	}

	async NewEmote(twitch_id: string, twitch_name: string, emote: NewEmote): Promise<void> {
		await this.Query(
			`INSERT INTO emotes (twitch_id, emote, emote_alias, emote_id) 
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT DO NOTHING`,
			[twitch_id, emote.name, emote.alias, emote.id],
		);

		Bot.Logger.Debug(`New Emote ${emote.name} added to ${twitch_name}`);
	}

	async UpdateEmote(emotes: UpdateEmote): Promise<void> {
		const { dbName, dbAlias, name, alias, id, channelId, channelName } = emotes;
		await Bot.SQL.Query(
			`INSERT INTO emotes (twitch_id, emote, emote_alias, emote_id)
			     VALUES ($1, $2, $3, $4)
			     ON CONFLICT (twitch_id, emote_id)
			     DO UPDATE SET emote = $2, emote_alias = $3 WHERE emotes.emote_id = $4`,
			[channelId, name, alias, id],
		);

		if (dbName !== name) Bot.Logger.Debug(`Emote name changed ${dbName} -> ${name} in ${channelName}`);
		if (dbAlias !== alias) Bot.Logger.Debug(`Emote alias changed ${dbAlias} -> ${alias} in ${channelName}`);
	}

	async GetChannels(): Promise<IChannel[]> {
		const Channels = await this.Query('SELECT * FROM channels');
		return Channels.rows;
	}

	async GetChannelsToJoin(): Promise<string[]> {
		const channels = await this.GetChannels();

		const chunks = [];
		let i = 0;
		const chunkLength = 500;

		while (i < channels.length) {
			chunks.push(channels.slice(i, (i += chunkLength)));
		}

		const payload: string[] = [];

		for (const chunk of chunks) {
			const gqlRequests: Promise<string | null>[] = [];
			for (const channel of chunk) {
				gqlRequests.push(this.UpdateAndGetChannel(channel.twitch_id, channel.twitch_username));
			}

			// Using 'as' here because without it I get a very weird ts error and I cba
			const results = (await Promise.all(gqlRequests)).filter((x) => x !== null) as string[];

			payload.push(...results);
		}

		return payload;
	}

	/**
	 *
	 * @param id User's twitch id
	 * @param channel User's twitch username according to the database
	 * @returns User's current twitch username
	 */
	async UpdateAndGetChannel(id: string, oldUsername: string): Promise<string | null> {
		const currentUsername = await GetUserLogin(id);

		if (currentUsername && currentUsername !== oldUsername) {
			Bot.SQL.Query(
				`UPDATE channels
				SET twitch_username = $2
				WHERE twitch_username = $1`,
				[oldUsername, currentUsername],
			);

			Bot.Logger.Log(`Updated username ${oldUsername} -> ${currentUsername}`);
		}

		return currentUsername;
	}
}
