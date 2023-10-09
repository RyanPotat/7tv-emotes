import type { PrivmsgMessage } from '@kararty/dank-twitch-irc';
import { ChannelHandler } from './ChannelHandler.js';

export async function CommandHandler(msg: PrivmsgMessage) {
	const { channelID, senderUserID, messageText } = msg;
	if (!Bot.Config.Admins.includes(channelID) || !Bot.Config.Admins.includes(senderUserID)) return;

	const prefix = '!';
	const args = messageText.slice(prefix.length).trim().split(/ +/g);
	const cmd = args.length > 0 ? args.shift()!.toLowerCase() : '';

	if (cmd === '7tvadd' && args[0]) {
		await ChannelHandler(args[0]);
	}
}
