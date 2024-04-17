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
		Bot.Twitch.Join(username);

		Bot.Logger.Warn(`Updating emotes for ${username}...`);
		// Loop over emotes from 7tv
		for (const emoteInfo of emote_set.emotes) {
			const getEmote = await Bot.SQL.Query(`SELECT emote, emote_id FROM emotes WHERE twitch_id = $1 AND emote_id = $2`, [id, emoteInfo.id]);

			const emoteAlias = emoteInfo.name === emoteInfo.data.name ? null : emoteInfo.name;

			// If the emote is not in the db then add it
			if (getEmote.rowCount === 0) {
				Bot.SQL.NewEmote(id, username, { name: emoteInfo.data.name, alias: emoteAlias, id: emoteInfo.id });
				continue;
			}

			const { emote, emote_alias, emote_id } = getEmote.rows[0];
			const emoteName = emoteInfo.data.name === '*UnknownEmote' ? emote : emoteInfo.data.name;
			if (emote === emoteName && emote_alias === emoteAlias && emote_id === emoteInfo.id) continue;

			// If the emote is in the db AND has a different name/alias then update it
			Bot.SQL.UpdateEmote({
				dbName: emote,
				dbAlias: emote_alias,
				name: emoteName,
				alias: emoteAlias,
				id: emoteInfo.id,
				channelId: id,
				channelName: username,
			});
		}
		Bot.Logger.Log(`Updated emotes for ${username}`);

		count++;
	}

	return { count };
}
