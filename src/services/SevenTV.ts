import fetch from 'node-fetch';
import type { I7tvUser, UserData, StvRest } from '../types/index.js';

const GQL = 'https://7tv.io/v3/gql';

export async function GetChannelGQL(stv_id: string): Promise<I7tvUser | null> {
	try {
		const { data, errors } = (await fetch(GQL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query: `query GetUsers($id: ObjectID!) {
					user(id: $id) {
					  id
					  username
					  display_name
					  created_at
					  avatar_url
					  emote_sets {
						id
						name
						capacity
						emotes {
						  name
						  id
						  data {
							name
							listed
						  }
						}
					  }
					  connections {
						id
						username
						display_name
						platform
						linked_at
						emote_capacity
						emote_set_id
					  }
					}
				  }`,
				variables: {
					id: stv_id,
				},
			}),
		}).then((res) => res.json())) as UserData;

		if (errors || !data || stv_id !== data.user.id) return null;

		const { emote_sets, connections } = data.user;

		const findTwitch = connections.find((connection: { platform: string }) => connection.platform === 'TWITCH');
		if (!findTwitch) return null;

		const findEmoteSet = emote_sets.find((emoteSet: { id: string }) => emoteSet.id === findTwitch.emote_set_id);
		if (!findEmoteSet) return null;

		return {
			stv_id,
			twitch_id: findTwitch.id,
			username: findTwitch.username,
			emote_set: findEmoteSet,
		};
	} catch (e) {
		return null;
	}
}

export const GetChannelsInfo = async (): Promise<I7tvUser[]> => {
	Bot.Logger.Log('Getting 7tv channel info...');

	const channels = await Bot.SQL.GetChannels();
	const channelIds = channels.map((c) => c.stv_id);

	const requests: Promise<I7tvUser | null>[] = [];

	for (const channelId of channelIds ?? []) {
		requests.push(GetChannelGQL(channelId));
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	const results = (await Promise.all(requests)).filter(Boolean) as I7tvUser[];

	return results;
};

export const GetStvId = async (channelId: string): Promise<StvRest> => {
	try {
		const data = (await fetch(`https://7tv.io/v3/users/twitch/${channelId}`, {
			method: 'GET',
		}).then((res) => res.json())) as StvRest;

		if (!data || data.error) throw new Error(`Failed to find ${channelId} in 7TV`);

		return data;
	} catch (e) {
		throw new Error(`Failed to find ${channelId} in 7TV`);
	}
};
