const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { MessageCollector } = require('discord.js');

let activeQuizzes = new Map(); // Track quiz state and data

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
        .setDescription('Start or end a math quiz!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a math quiz'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End the current math quiz')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const channelId = interaction.channel.id;
        const userId = interaction.user.id;

        try {
            if (subcommand === 'start') {
                // End any active quiz in the channel if exists
                if (activeQuizzes.has(channelId)) {
                    const quizData = activeQuizzes.get(channelId);
                    quizData.collector.stop();
                    activeQuizzes.delete(channelId);

                    const endEmbed = new EmbedBuilder()
                        .setTitle('Math Quiz Ended ⏳')
                        .setDescription(`A new quiz is starting. The previous quiz has been ended.`)
                        .setColor(0xff0000); // Corrected color format

                    await interaction.reply({ embeds: [endEmbed] });
                }

                // Start a new quiz
                let { question, answer } = generateQuestion(); // Changed to let
                const color = 0x0099ff; // Corrected color format

                const quizEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz 🧠')
                    .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                    .setColor(color)
                    .setFooter({ text: '⏳ You have 30 seconds to answer each question.' });

                await interaction.reply({ embeds: [quizEmbed] });

                const filter = response => {
                    return response.content.startsWith('!') && 
                           response.author.id === userId &&
                           !isNaN(response.content.slice(1).trim());
                };

                const collector = new MessageCollector(interaction.channel, { filter, time: 3 * 60 * 1000 });

                let questionTimer; // Changed to let

                const startQuestionTimer = () => {
                    questionTimer = setTimeout(() => {
                        const newQuestion = generateQuestion();
                        question = newQuestion.question;
                        answer = newQuestion.answer;

                        const newQuestionEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription(`**New Question:** What is ${question}? Respond with \`!<your answer>\``)
                            .setColor(color)
                            .setFooter({ text: '⏳ You have 30 seconds to answer each question.' });

                        interaction.followUp({ embeds: [newQuestionEmbed] });

                        startQuestionTimer(); // Restart the question timer
                    }, 30 * 1000);
                };

                startQuestionTimer();

                collector.on('collect', response => {
                    const userAnswer = parseInt(response.content.slice(1).trim(), 10);
                    if (userAnswer === answer) {
                        clearTimeout(questionTimer);

                        const correctEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription(`✅ Correct! Here is the next question.`)
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
                    activeQuizzes.delete(channelId);

                    const endEmbed = new EmbedBuilder()
                        .setTitle('Math Quiz Ended ⏳')
                        .setDescription(`The quiz has ended. Thanks for participating!`)
                        .setColor(0xff0000); // Corrected color format

                    interaction.followUp({ embeds: [endEmbed] });
                });

                activeQuizzes.set(channelId, { question, answer, collector, commandUser: userId });

            } else if (subcommand === 'end') {
                if (!activeQuizzes.has(channelId)) {
                    await interaction.reply('There is no active quiz to end in this channel.');
                    return;
                }

                const quizData = activeQuizzes.get(channelId);
                if (quizData.commandUser !== userId) {
                    await interaction.reply('You do not have permission to end this quiz.');
                    return;
                }

                quizData.collector.stop(); // Stop the collector and end the quiz

                const endEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz Ended ⏳')
                    .setDescription(`The quiz has ended. Thanks for participating!`)
                    .setColor(0xff0000); // Corrected color format

                await interaction.reply({ embeds: [endEmbed] });
                activeQuizzes.delete(channelId);
            }
        } catch (error) {
            console.error(error);
            await interaction.reply('An error occurred while executing this command. Please try again later.');
        }
    },
};
