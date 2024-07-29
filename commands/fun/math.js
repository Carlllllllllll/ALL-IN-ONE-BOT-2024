const { SlashCommandBuilder } = require('discord.js');

// Utility to generate random math questions
function generateQuestion() {
    const operators = ['+', '-', '*', '/'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;

    let question = '';
    let answer = 0;

    switch (operator) {
        case '+':
            question = `${num1} + ${num2}`;
            answer = num1 + num2;
            break;
        case '-':
            question = `${num1} - ${num2}`;
            answer = num1 - num2;
            break;
        case '*':
            question = `${num1} * ${num2}`;
            answer = num1 * num2;
            break;
        case '/':
            question = `${num1} / ${num2}`;
            answer = Math.round(num1 / num2);
            break;
    }

    return { question, answer };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('math')
        .setDescription('Start a math quiz!'),
    async execute(interaction) {
        const { question, answer } = generateQuestion();
        const emoji = '🧠'; // Emoji to represent the quiz

        await interaction.reply(`**Math Quiz ${emoji}:** What is ${question}?`);

        // Collecting the answer
        const filter = response => response.author.id === interaction.user.id && !isNaN(response.content);
        const collector = interaction.channel.createMessageCollector({ filter, time: 15000 });

        collector.on('collect', response => {
            const userAnswer = parseInt(response.content.trim(), 10);
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
