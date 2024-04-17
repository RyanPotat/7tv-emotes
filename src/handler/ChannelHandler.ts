import { IVR } from '../services/IVR.js';
import { GetChannelGQL, GetStvId } from '../services/SevenTV.js';

const ParseUser = (user: string): string => {
	const parsed = user.replace(/[@#,]/g, ''); // Remove @, #, and ,
	return parsed.toLowerCase();
};

export async function ChannelHandler(channel: string) {
	try {
		const targetUser = ParseUser(channel);
		const data = await IVR(targetUser);
		if (!data || !data.id) throw `Failed to find ${targetUser} in IVR`;

		const StvId = await GetStvId(data.id);

		const StvUser = await GetChannelGQL(StvId.user.id);
		if (!StvUser?.emote_set) throw `Failed to find ${targetUser} in 7TV Emotes`;

		const doesChannelExist = await Bot.SQL.Query(`SELECT * FROM channels WHERE twitch_id = $1`, [data.id]);
		if (doesChannelExist.rowCount > 0) throw `Channel ${targetUser} already exists in the database`;

		const emotesListed = StvUser.emote_set.emotes.map((emote: { name: string; id: string; data: { name: string } }) => ({
			name: emote.data.name,
			alias: emote.name,
			id: emote.id,
		}));
		if (emotesListed.length === 0) throw `7TV returned no emotes for ${targetUser} (${data.id})`;

		await Bot.Redis.setArray(`emotes:${data.id}`, emotesListed);
		await Bot.SQL.Query(
			`
			INSERT INTO channels 
			(twitch_username, twitch_id, stv_id) 
			VALUES ($1, $2, $3) 
			ON CONFLICT DO NOTHING`,
			[targetUser, data.id, StvId.user.id],
		);

		for (const emote of StvUser.emote_set.emotes) {
			const emoteAlias = emote.name === emote.data.name ? null : emote.name;
			await Bot.SQL.Query(
				`
				INSERT INTO emotes 
				(twitch_id, emote, emote_alias, emote_id, emote_count)
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (twitch_id, emote_id)
				DO UPDATE SET emote = $2, emote_alias = $3 WHERE emotes.emote_id = $4`,
				[data.id, emote.data.name, emoteAlias, emote.id, 0],
			);
		}

		Bot.Twitch.Join(targetUser);
		Bot.Logger.Log(`Added ${targetUser} to the database`);
	} catch (error) {
		Bot.Logger.Error(String(error));
		throw error;
	}
}
