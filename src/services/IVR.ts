import fetch from 'node-fetch';
import type { IVR } from '../types/index.js';

export async function IVR(channel: string, type?: boolean): Promise<IVR | null> {
	const requestType = type ? 'id' : 'login';
	try {
		const data = (await fetch(`https://api.ivr.fi/v2/twitch/user?${requestType}=${channel}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'User-Agent': 'markzynk/7tv-emotes',
			},
		}).then((res) => res.json())) as IVR[];

		if (!data || data.length === 0) return null;

		return data[0];
	} catch (e) {
		return null;
	}
}
