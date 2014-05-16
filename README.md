Commandline WebAPI Interface
----------------------------

Syntax:
	spapi [command] {arguments ...}

Examples:
	spapi authorize
		Request access with default scopes

	spapi authorize user-read-email,playlist-read
		Request access with a specific set of scopes

	spapi refresh
		Refresh access token using last refresh token

	spapi curl https://api.spotify.com/v1/me
		Get information about the currently authenticated user

	spapi curl /users/{username}/playlists
		Get a list of a users playlists

