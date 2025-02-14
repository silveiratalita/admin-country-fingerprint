const corsHeaders = {
	'Access-Control-Allow-Origin': '*', // Change to your frontend origin if necessary
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function handleOptions(request) {
	if (
		request.headers.get('Origin') !== null &&
		request.headers.get('Access-Control-Request-Method') !== null &&
		request.headers.get('Access-Control-Request-Headers') !== null
	) {
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		});
	} else {
		// Not a CORS preflight request
		return new Response(null, {
			headers: { Allow: 'GET, HEAD, POST, OPTIONS' },
		});
	}
}

function createResponse(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export default {
	async fetch(request, env) {
		if (request.method === 'OPTIONS') {
			return handleOptions(request);
		}

		try {
			const url = new URL(request.url);

			switch (url.pathname) {
				case '/api/login':
					return await handleLogin(request, env);
				case '/api/register':
					return await handleRegister(request, env);
				case '/dashboard':
					return await handleDashboard(request, env);
				case '/api/acessos': // Nova rota para pegar dados da tabela acessos
					return await handleAcessos(request, env);
				default:
					return createResponse({ error: 'Rota não encontrada' }, 404);
			}
		} catch (error) {
			console.error(error);
			return createResponse({ error: error.message }, 500);
		}
	},
};

async function handleRegister(request, env) {
	const { email, password } = await request.json();
	const encodedPassword = btoa(unescape(encodeURIComponent(password)));

	try {
		await env.DB.prepare('INSERT INTO auth (email, pass) VALUES (?, ?)').bind(email, encodedPassword).run();
		return new Response(JSON.stringify({ message: 'Registro bem-sucedido' }), {
			status: 200,
			headers: corsHeaders, // Ensure CORS headers are included
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Erro no registro: ' + error.message }), {
			status: 500,
			headers: corsHeaders, // Ensure CORS headers are included
		});
	}
}

async function handleLogin(request, env) {
	const { email, password } = await request.json();
	const encodedPassword = btoa(unescape(encodeURIComponent(password)));

	try {
		const result = await env.DB.prepare('SELECT * FROM auth WHERE email = ?').bind(email).first();

		if (result && result.pass === encodedPassword) {
			const token = `${email}#${Date.now() + 3600000}`;
			return new Response(JSON.stringify({ token }), {
				status: 200,
				headers: corsHeaders,
			});
		} else {
			return new Response(JSON.stringify({ error: 'Credenciais inválidas' }), {
				status: 401,
				headers: corsHeaders,
			});
		}
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Erro no login: ' + error.message }), {
			status: 500,
			headers: corsHeaders,
		});
	}
}

async function handleDashboard(request, env) {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) {
		return new Response(JSON.stringify({ error: 'Não autorizado' }), {
			status: 401,
			headers: corsHeaders,
		});
	}

	const token = authHeader.split(' ')[1];
	const [email, exp] = token.split('.');
	if (Date.now() < parseInt(exp, 10)) {
		return new Response(JSON.stringify({ message: `Bem-vindo ao dashboard, ${email}` }), {
			status: 200,
			headers: corsHeaders,
		});
	} else {
		return new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
			status: 401,
			headers: corsHeaders,
		});
	}
}
async function handleAcessos(request, env) {
	if (request.method === 'OPTIONS') {
		return handleOptions(request);
	}

	try {
		const results = await env.DB.prepare('SELECT * FROM acessos').all();

		return new Response(
			JSON.stringify({
				results,
			}),
			{
				status: 200,
				headers: corsHeaders,
			},
		);
	} catch (error) {
		console.error('Erro ao buscar dados de acessos:', error);

		return new Response(
			JSON.stringify({
				error: `Erro ao buscar dados de acessos: ${error.message}`,
			}),
			{
				status: 500,
				headers: corsHeaders,
			},
		);
	}
}
