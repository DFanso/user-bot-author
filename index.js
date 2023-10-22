const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const yaml = require("js-yaml");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
    ],
});

const config = yaml.load(fs.readFileSync("config.yml", "utf8"));
const { token } = config.bot;

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(token);

async function getUserInfo(userID, guildID, messageClient) {
    try {
		let user = await messageClient.users.fetch(userID);
		let member = messageClient.guilds.cache
			.get(guildID)
			.members.cache.get(user.id);
		let userName = user.username;
		let displayName = user.tag;
		let discriminator = user.discriminator;
		let bannerHexColor = user.accentColor ? user.accentColor.toString(16) : "000000"; // Defaulting to black color
		let avatarURL = user.displayAvatarURL({ format: "png", dynamic: true });
		let isAnimatedAvatar = avatarURL && typeof avatarURL === 'string' && avatarURL.includes(".gif");
		let bannerURL = user.bannerURL({ format: "png", dynamic: true });
		let isAnimatedBanner = bannerURL && typeof bannerURL === 'string' && bannerURL.includes(".gif");
		let accountCreationDate = new Date(user.createdAt).getTime();
		let monitoringSince = member
			? new Date(member.joinedAt).getTime()
			: null;
		let presence = member ? member.presence : null;

		let userObj = {
			userId: userID,
			userName: userName,
			displayName: displayName,
			discriminator: discriminator,
			bannerHexColor: bannerHexColor,
			avatarURL: avatarURL,
			isAnimatedAvatar: isAnimatedAvatar,
			bannerURL: bannerURL,
			isAnimatedBanner: isAnimatedBanner,
			accountCreationDate: accountCreationDate,
			monitoringSince: monitoringSince,
			activities: {},
		};

		let spotifyActivity = null;

		if (presence) {
			for (let activity of presence.activities) {
				const activityName = activity.name;
				if (!userObj.activities[activityName]) {
					userObj.activities[activityName] = {};
				}
				if (activity.name === "Spotify") {
                    spotifyActivity = activity;
                    let largeImage = spotifyActivity && spotifyActivity.assets ? spotifyActivity.assets.largeImage : null;
                    let spotifyTrackId = largeImage.split(":")[1];
                    let songName = spotifyActivity.details;
                    let songArtist = spotifyActivity.state;
                    let albumCoverImageUrl = `https://i.scdn.co/image/${spotifyTrackId}`;
                    let currentTimestamp = Math.floor(Date.now() / 1000);
                
                    let startTimestamp, endTimestamp;
                    if (spotifyActivity && spotifyActivity.timestamps) {
                        if (spotifyActivity.timestamps.start) {
                            startTimestamp = new Date(spotifyActivity.timestamps.start).getTime() / 1000;
                        }
                        if (spotifyActivity.timestamps.end) {
                            endTimestamp = new Date(spotifyActivity.timestamps.end).getTime() / 1000;
                        }
                    }
                
                    let totalTime = (endTimestamp && startTimestamp) ? endTimestamp - startTimestamp : 0;
                    let elapsedTime = currentTimestamp - startTimestamp;
                    let elapsedSeconds = elapsedTime % 60;
                    let elapsedMinutes = Math.floor(elapsedTime / 60);
                    let totalSeconds = totalTime % 60;
                    let totalMinutes = Math.floor(totalTime / 60);
                
                    userObj.activities[activityName].trackId = spotifyTrackId; // Notice the change here: `spotifyTrackId`
                    userObj.activities[activityName].songName = songName;
                    userObj.activities[activityName].songArtist = songArtist;
                    userObj.activities[activityName].albumCoverImageUrl = albumCoverImageUrl;
                    userObj.activities[activityName].startTimestamp = startTimestamp;
                    userObj.activities[activityName].endTimestamp = endTimestamp;
                } else {
					userObj.activities[activityName].name = activity.name;
					userObj.activities[activityName].details = activity.details;
					userObj.activities[activityName].state = activity.state;
					if (activity.timestamps && activity.timestamps.start) {
                        userObj.activities[activityName].startPlayTimestamp = Date.parse(activity.timestamps.start) / 1000;
                    }                    
					if (activity.assets && activity.assets.largeImage) {
                        userObj.activities[activityName].largeImageUrl = `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.largeImage}.png`;
                    }                    
					if (activity.assets && activity.assets.smallImage) {
                        userObj.activities[activityName].smallImageUrl = `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${activity.assets.smallImage}.png`;
                    }                    
				}
			}
		}

		return userObj;
	} catch (error) {
		console.error("Error fetching user:", error);
		return null; // You can return an error object or message here if needed.
	}
}

async function getFullUserInfo(userID, guildID, messageClient) {
    const userObj = await getUserInfo(userID, guildID, messageClient);
    return userObj;
}

async function returnUserInformation(userObj) {
    console.log(userObj);
}

client.on("messageCreate", async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;


    if (message.content.startsWith("!info")) {
        
        const args = message.content.split(" "); // Split by space
        const userID = args[1]; // The ID should be the second argument

        // Check if an ID was provided
        if (!userID) {
            message.reply("Please provide a user ID.");
            return;
        }

        const guildId = message.guild.id;

        // Fetch user info using the getFullUserInfo function
        const userInfo = await getFullUserInfo(userID, guildId, client);

        if (userInfo) {
            returnUserInformation(userInfo);
        } else {
            console.error("Couldn't fetch user information");
        }
    }
});
