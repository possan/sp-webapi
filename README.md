Commandline interface to the Spotify WebAPI
-------------------------------------------


Syntax:

	sp-webapi [command] {arguments ...}

Examples:

	sp-webapi authorize
		Request access with default scopes

	sp-webapi authorize user-read-email,playlist-read
		Request access with a specific set of scopes

	sp-webapi refresh
		Refresh access token using last refresh token

	sp-webapi curl https://api.spotify.com/v1/me
		Get information about the currently authenticated user

	sp-webapi curl /users/{username}/playlists
		Get a list of a users playlists

