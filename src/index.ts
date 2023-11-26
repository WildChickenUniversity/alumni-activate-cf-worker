export interface Env {
	EMAIL_FIB: KVNamespace;
	account_id: string;
	zone_id: string;
	API_TOKEN: string;
}

const handler: ExportedHandler<Env> = {
	async fetch(request: Request, env: Env) {
		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405 });
		}

		const requestData = await request.json();
		// @ts-ignore
		const key = requestData.username;
		// @ts-ignore
		const value = requestData.email;

		let responseMessage = '';
		let statusCode = 200;

		const getDestinationEndpoint = `https://api.cloudflare.com/client/v4/accounts/${env.account_id}/email/routing/addresses`;

		const getDestinationResponse = await fetch(getDestinationEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.API_TOKEN}`,
			},
			body: JSON.stringify({
				email: `${value}`,
			}),
		});

		console.log(getDestinationResponse);

		if (getDestinationResponse.ok) {
			const jsonResponse = await getDestinationResponse.json();
			// @ts-ignore
			const verified = jsonResponse.result?.verified;

			if (verified) {
				const createRoutingRuleEndpoint = `https://api.cloudflare.com/client/v4/zones/${env.zone_id}/email/routing/rules`;

				const createRoutingRuleResponse = await fetch(createRoutingRuleEndpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${env.API_TOKEN}`,
					},
					body: JSON.stringify({
						actions: [
							{
								type: 'forward',
								value: [`${value}`],
							},
						],
						enabled: true,
						matchers: [
							{
								field: 'to',
								type: 'literal',
								value: `${key}@ealumni.wcu.edu.pl`,
							},
						],
					}),
				});
			} else {
				responseMessage = 'email not verified, fuck off';
				statusCode = 409;
			}
		} else {
			responseMessage = `${getDestinationResponse.status}`;
			statusCode = 400;
		}
		return new Response(responseMessage, { status: statusCode });
	},
};

export default handler;
