const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { MessageCollector } = require('discord.js');

let activeQuizzes = new Set();

function generateQuestion() {
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;
    const operations = ['+', '-'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    const question = `${num1} ${operation} ${num2}`;
    let answer;

    switch (operation) {
        case '+':
            answer = num1 + num2;
            break;
        case '-':
            answer = num1 - num2;
            break;
    }

    return { question, answer };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mathquiz')
        .setDescription('Start a math quiz!'),
    async execute(interaction) {
        if (activeQuizzes.has(interaction.channel.id)) {
            await interaction.reply('There is already an active quiz in this channel.');
            return;
        }

        activeQuizzes.add(interaction.channel.id);

        let { question, answer } = generateQuestion();
        const color = parseInt('0099ff', 16);

        const quizEmbed = new EmbedBuilder()
            .setTitle('Math Quiz 🧠')
            .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
            .setColor(color)
            .setFooter({ text: '⏳ You have 30 seconds to answer each question.' });

        await interaction.reply({ embeds: [quizEmbed] });

        const filter = response => {
            return response.content.startsWith('!') && 
                   response.author.id !== interaction.client.user.id &&
                   !isNaN(response.content.slice(1).trim());
        };

        const collector = new MessageCollector(interaction.channel, { filter, time: 3 * 60 * 1000 });

        let questionTimer;

        const startQuestionTimer = () => {
            questionTimer = setTimeout(() => {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('Time\'s up for this question! ⏳')
                    .setDescription(`The correct answer was: ${answer}. Moving to the next question.`)
                    .setColor('#ff0000');
                
                interaction.followUp({ embeds: [timeoutEmbed] });
                
                const newQuestion = generateQuestion();
                question = newQuestion.question;
                answer = newQuestion.answer;

                const newQuestionEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz 🧠')
                    .setDescription(`**New Question:** What is ${question}? Respond with \`!<your answer>\``)
                    .setColor(color)
                    .setFooter({ text: '⏳ You have 30 seconds to answer each question.' });

                interaction.followUp({ embeds: [newQuestionEmbed] });

                startQuestionTimer();
            }, 30 * 1000);
        };

        startQuestionTimer();

        collector.on('collect', response => {
            const userAnswer = parseInt(response.content.slice(1).trim(), 10);
            if (userAnswer === answer) {
                clearTimeout(questionTimer);

                const correctEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz 🧠')
                    .setDescription(`✅ Correct! Moving to the next question.`)
                    .setColor(color);

                interaction.followUp({ embeds: [correctEmbed] });

                const newQuestion = generateQuestion();
                question = newQuestion.question;
                answer = newQuestion.answer;

                const newQuestionEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz 🧠')
                    .setDescription(`**New Question:** What is ${question}? Respond with \`!<your answer>\``)
                    .setColor(color)
                    .setFooter({ text: '⏳ You have 30 seconds to answer each question.' });

                interaction.followUp({ embeds: [newQuestionEmbed] });

                startQuestionTimer();
            } else {
                response.reply('❌ Incorrect answer! Try again.');
            }
        });

        collector.on('end', collected => {
            clearTimeout(questionTimer);
            activeQuizzes.delete(interaction.channel.id);

            const endEmbed = new EmbedBuilder()
                .setTitle('Math Quiz Ended ⏳')
                .setDescription(`The quiz has ended. Thanks for participating!`)
                .setColor('#ff0000');

            interaction.followUp({ embeds: [endEmbed] });
        });
    },
};
