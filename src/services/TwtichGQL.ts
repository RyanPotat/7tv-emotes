export async function GetUserLogin(id: string): Promise<string | null> {
	try {
		const { data } = await fetch('https://gql.twitch.tv/gql', {
			method: 'POST',
			headers: {
				'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
			},
			body: JSON.stringify({
				query: `query user {
	
	user(id: "${id}") {
        login
	}
}`,
				variables: {},
			}),
		}).then((res) => res.json());

		if (!data || !data.user) return null;

		return data.user.login;
	} catch (e) {
		return null;
	}
}
