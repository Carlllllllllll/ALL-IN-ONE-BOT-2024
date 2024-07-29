const { SlashCommandBuilder } = require('@discordjs/builders');

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
        const { question, answer } = generateQuestion();
        await interaction.reply(`**Math Quiz:** What is ${question}? Respond with \`!<your answer>\``);

        const filter = response => {
            // Ensure the message starts with '!' and the author is the same as the interaction user
            return response.content.startsWith('!') && response.author.id === interaction.user.id;
        };

        const collector = interaction.channel.createMessageCollector({ filter, time: 15000 });

        collector.on('collect', response => {
            const userAnswer = parseInt(response.content.slice(1).trim(), 10);
            if (userAnswer === answer) {
                interaction.followUp(`🎉 Correct! The answer is ${answer}.`);
            } else {
                interaction.followUp(`❌ Wrong! The correct answer was ${answer}.`);
            }
            collector.stop(); // Stop collecting after the answer is given
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp(`⏳ Time's up! The correct answer was ${answer}.`);
            }
        });
    },
};
