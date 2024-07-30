const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');

function generateQuestion() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operation = Math.random() > 0.5 ? '+' : '-';
    const question = `${num1} ${operation} ${num2}`;
    const answer = operation === '+' ? num1 + num2 : num1 - num2;
    return { question, answer };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mathquiz')
        .setDescription('Start a math quiz!'),
    async execute(interaction) {
        let { question, answer } = generateQuestion();

        // Convert the string color to a number
        const color = parseInt('0099ff', 16);

        // Create an embed for the quiz question
        const quizEmbed = new EmbedBuilder()
            .setTitle('Math Quiz 🧠')
            .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
            .setColor(color)
            .setFooter({ text: '⏳ You have 3 minutes to answer.' });

        const quizMessage = await interaction.reply({ embeds: [quizEmbed], fetchReply: true });

        const filter = response => {
            // Ensure the message starts with '!' and the author is not the bot
            return response.content.startsWith('!') && response.author.id !== interaction.client.user.id;
        };

        const collector = interaction.channel.createMessageCollector({ filter, time: 3 * 60 * 1000 }); // 3 minutes in milliseconds

        collector.on('collect', response => {
            const userAnswer = parseInt(response.content.slice(1).trim(), 10);
            if (userAnswer === answer) {
                // Correct answer, send a new question
                ({ question, answer } = generateQuestion());
                quizEmbed.setDescription(`✅ **Correct!** The answer was ${answer}. New question: What is ${question}? Respond with \`!<your answer>\``);
                quizMessage.edit({ embeds: [quizEmbed] });
            } else {
                // Wrong answer
                response.reply(`❌ Incorrect answer! Try again.`);
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                // No responses, update embed to show timeout
                quizEmbed.setDescription(`⏳ **Time's up!** The last question was: What is ${question}? The correct answer was ${answer}.`);
                quizMessage.edit({ embeds: [quizEmbed] });
            }
        });
    },
};
