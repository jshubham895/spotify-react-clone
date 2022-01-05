import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import spotifyApi, { LOGIN_URL } from "../../../lib/spotify";

async function refreshAccessToken(token) {
	try {
		spotifyApi.setAccessToken(token.accessToken);
		spotifyApi.setRefreshToken(token.refreshToken);

		const { body: refreshedToken } = await spotifyApi.refreshAccessToken();
		// console.log("Refreshed token is ", refreshedToken);

		return {
			...token,
			accessToken: refreshedToken.access_token,
			accessTokenExpires: Date.now() + refreshedToken.expires_in * 1000,
			refreshToken: refreshedToken.refresh_token ?? token.refreshToken
		};
	} catch (error) {
		console.log(error);

		return {
			...token,
			error: "RefreshTokenError"
		};
	}
}

export default NextAuth({
	// Configure one or more authentication providers
	providers: [
		SpotifyProvider({
			clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
			clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
			authorization: LOGIN_URL
		})
		// ...add more providers here
	],
	secret: process.env.JWT_SECRET,
	pages: {
		signIn: "/login"
	},
	callbacks: {
		// initial sign in

		async jwt({ token, account, user }) {
			if (account && user) {
				return {
					...token,
					accessToken: account.access_token,
					refreshToken: account.refresh_token,
					username: account.providerAccountId,
					accessTokenExpires: account.expires_at * 1000 //tackling in ms
				};
			}

			// return previous token if it is not expired

			if (Date.now() < token.accessTokenExpires) {
				// console.log("Existing token is not expired");
				return token;
			}

			// if access token is expired so we need to refresh it
			// console.log("Access token is expired");
			return await refreshAccessToken(token);
		},

		async session({ session, token }) {
			session.user.accessToken = token.accessToken;
			session.user.refreshToken = token.refreshToken;
			session.user.username = token.username;

			return session;
		}
	}
});
