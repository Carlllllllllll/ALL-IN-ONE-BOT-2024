const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {

        const activities = [
            { name: 'Netflix 📺', type: ActivityType.Watching },
            { name: 'GTA VI 🎮', type: ActivityType.Playing },
            { name: 'on YouTube 📹', type: ActivityType.Streaming },
            { name: 'Spotify 🎵', type: ActivityType.Listening },
            { name: 'commands ⚙️', type: ActivityType.Playing },
            { name: 'servers 📊', type: ActivityType.Watching },
            { name: 'users 💬', type: ActivityType.Listening },
            { name: 'updates 🚀', type: ActivityType.Playing },
        ];

        const statuses = ['online', 'idle', 'dnd'];

        let currentActivityIndex = 0;
        let currentStatusIndex = 0;

        function setActivityAndStatus() {
            // Add dynamic activity with server and user count
            const serverCount = client.guilds.cache.size;
            const userCount = client.users.cache.size;
            const dynamicActivity = { name: ` ${serverCount} servers and ${userCount} users 🤖`, type: ActivityType.Watching };

            const activity = currentActivityIndex === activities.length ? dynamicActivity : activities[currentActivityIndex];
            const status = statuses[currentStatusIndex];

            client.user.setPresence({
                activities: [activity],
                status: status,
            });

            currentActivityIndex = (currentActivityIndex + 1) % (activities.length + 1); // +1 for dynamicActivity
            currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
        }

        setTimeout(() => {
            setActivityAndStatus();
            console.log('\x1b[31m[ CORE ]\x1b[0m \x1b[32m%s\x1b[0m', 'Bot Activity Set Successfully ✅');
        }, 2000);

        setInterval(() => {
            setActivityAndStatus();
        }, 5000); // Change activity every 5 seconds
    },
};
