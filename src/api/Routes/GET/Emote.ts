import Express from 'express';
import { Limiter } from '../../Middleware/RateLimit.js';
const Router = Express.Router();

type Emote = {
    twitch_id: string;
	emote_alias: string | null;
	emote_count: number;
	added: Date;
};

Router.get('/e/:emote', Limiter(1000, 10), async (req, res) => {
	let { emote } = req.params;
	const limit = req.query.limit || null;

	const emoteData = await Bot.SQL.Query(
		`SELECT emotes.* 
		FROM emotes
	    WHERE emotes.emote_id = $1
		ORDER BY emotes.emote_count DESC`,
		[emote],
	);

	if (emoteData.rowCount === 0) {
		return res.status(404).json({
			success: false,
			message: 'No emote data found',
		});
	}

	const channels = emoteData.rows.map((emote: Emote) => {
		return {
            id: emote.twitch_id,
			alias: emote.emote_alias,
			count: emote.emote_count,
			added: emote.added,
		};
	});

	return res.status(200).json({
		success: true,
        emote: {
            name: emoteData.rows[0].emote,
            id: emote,
            total_count: channels.reduce((a: number, b:  { count: number}) => a + b.count, 0),
        },
		channels: limit == null ? channels : channels.slice(0, limit),
	});
});

export default Router;
