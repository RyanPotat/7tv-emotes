import type { PrivmsgMessage } from '@kararty/dank-twitch-irc';

export async function EmoteHandler(msg: PrivmsgMessage): Promise<void> {
	const get = (await Bot.Redis.getEmotes(msg.channelID)) ?? [];
	const emotesUsedByNames: Record<string, [string, string, number]> = {};

	msg.messageText.split(/\s/g).forEach((word) => {
		get.forEach((emote) => {
			const emoteName = emote.alias === emote.name ? emote.name : emote.alias;
			if (emoteName === word) {
				emotesUsedByNames[emote.name] ||= [emote.alias, emote.id, 0];
				emotesUsedByNames[emote.name][2]++;
			}
		});
	});

	if (Object.entries(emotesUsedByNames).length > 0) {
		for (const [name, [emoteAlias, id, count]] of Object.entries(emotesUsedByNames)) {
			const alias = name == emoteAlias ? null : emoteAlias;
			await Bot.SQL.Query(`UPDATE emotes SET emote_count = emotes.emote_count + $1 WHERE emotes.twitch_id = $2 AND emotes.emote_id = $3`, [
				count,
				msg.channelID,
				id,
			]);

			Bot.WS.Send(msg.channelID, {
				type: 'emote',
				channelName: msg.channelName,
				channelId: msg.channelID,
				senderName: msg.senderUsername,
				senderId: msg.senderUserID,
				data: {
					name,
					alias,
					id,
					count,
				},
			});

			Bot.Logger.Debug(`Emote ${name} (${id}) used ${count} times in ${msg.channelName}`);
			Bot.Logger.Debug(`${process.memoryUsage().rss / 1024 / 1024} MB, ${process.memoryUsage().heapUsed / 1024 / 1024} MB`);
		}
	}
}
