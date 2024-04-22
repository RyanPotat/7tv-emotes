export interface IChannels {
	result: I7tvUser[];
	length: number;
}

export interface I7tvUser {
	stv_id: string;
	twitch_id: string;
	username: string;
	emote_set: {
		id: string;
		name: string;
		capacity: number;
		emotes: IEmote[];
	};
}

export interface IChannel {
	id: number;
	twitch_username: string;
	twitch_id: string;
	stv_id: string;
	tracking_since: Date;
	tracking: boolean;
	current_stv_set: string;
}

export interface IEmote {
	name: string;
	id: string;
	data: {
		name: string;
		listed: boolean;
	};
}

export interface RedisEmote {
	name: string;
	alias: string;
	id: string;
}

export interface UserData {
	data: {
		user: {
			id: string;
			emote_sets: {
				id: string;
				name: string;
				capacity: number;
				emotes: IEmote[];
			}[];
			connections: Connections[];
		};
	};
	errors?: Errors[];
}

export interface Connections {
	id: string;
	username: string;
	platform: string;
	emote_set_id: string | null;
}

export interface Errors {
	message: string;
	path: string[];
}

export interface IVR {
	id: string;
	login: string;
	display_name: string;
	length: number;
}

export interface StvRest {
	user: {
		id: string;
	};
	error?: string;
}

export interface ListenMessage {
	op: number;
	t: number;
	d: {
		type: string;
		condition: {
			object_id: string;
		};
	};
}

export interface DispatchData {
	type: string;
	body: {
		id: string;
		pushed?: any;
		pulled?: any;
		updated?: any;
		actor: {
			id: string;
			display_name: string;
			username: string;
			connections: {
				platform: string;
				id: string;
			}[];
		};
	};
}
