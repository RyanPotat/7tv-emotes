import type { IEmoteSet } from '../types/index.js';
import type { IChannels } from '../types/types.js';

export async function ChannelEmoteManager(mapped: IEmoteSet[]): Promise<IChannels> {
	let count: number = 0;

	if (!mapped.length) return { count };

	for (const { id, username, emote_sets } of mapped) {
		if (!emote_sets || !emote_sets.emotes) {
			Bot.Logger.Warn(`7TV returned no emotes for ${username} (${id})`);
			continue;
		}

		const emotesListed = emote_sets.emotes.map((emote: { name: string; id: string; data: { name: string } }) => ({
			name: emote.data.name,
			alias: emote.name,
			id: emote.id,
		}));

		if (emotesListed.length === 0) {
			Bot.Logger.Warn(`7TV returned no emotes for ${username} (${id})`);
			continue;
		}

		Bot.Logger.Debug(`${emotesListed.length} Emotes Loaded in ${username} (${id})`);
		Bot.Redis.setArray(`emotes:${id}`, emotesListed);
		Bot.SQL.EmoteLooper(emote_sets.emotes, id, username);
		Bot.Twitch.Join(username);
		count++;
	}

	return { count };
}
