const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { MessageCollector } = require('discord.js');

let activeQuizzes = new Map(); // Track quiz state and data

function generateQuestion() {
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;
    const operations = ['+', '-'];
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let question, answer;

    if (operation === '+') {
        question = `${num1} + ${num2}`;
        answer = num1 + num2;
    } else { // operation === '-'
        if (num1 < num2) {
            [num1, num2] = [num2, num1]; // Swap to avoid negative results
        }
        question = `${num1} - ${num2}`;
        answer = num1 - num2;
    }

    return { question, answer };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mathquiz')
        .setDescription('Start a math quiz or end it.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new math quiz'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('endgame')
                .setDescription('End the current math quiz')),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            if (activeQuizzes.has(interaction.channel.id)) {
                await interaction.reply({ content: 'There is already an active quiz in this channel.', ephemeral: true });
                return;
            }

            activeQuizzes.set(interaction.channel.id, {
                commandUser: interaction.user.id,
                questionData: generateQuestion(),
                collector: null,
                questionTimer: null,
                questionAnswered: false // Track if the current question is answered
            });

            const { question } = activeQuizzes.get(interaction.channel.id).questionData;
            const color = '#0099ff';

            const quizEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                .setColor(color)
                .setFooter({ text: '⏳ You have 30 seconds to answer this question.' });

            await interaction.reply({ embeds: [quizEmbed] });

            const filter = response => {
                return response.content.startsWith('!') &&
                    response.author.id !== interaction.client.user.id &&
                    !isNaN(response.content.slice(1).trim()) &&
                    response.channel.id === interaction.channel.id;
            };

            const collector = new MessageCollector(interaction.channel, { filter, time: 3 * 60 * 1000 });
            activeQuizzes.get(interaction.channel.id).collector = collector;

            const startQuestionTimer = () => {
                const { answer } = activeQuizzes.get(interaction.channel.id).questionData;

                activeQuizzes.get(interaction.channel.id).questionTimer = setTimeout(() => {
                    if (!activeQuizzes.get(interaction.channel.id).questionAnswered) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setTitle('Time\'s up for this question! ⏳')
                            .setDescription(`The correct answer was: ${answer}. Here is a new question.`)
                            .setColor('#ff0000');

                        interaction.followUp({ embeds: [timeoutEmbed] });

                        const newQuestion = generateQuestion();
                        activeQuizzes.get(interaction.channel.id).questionData = newQuestion;
                        activeQuizzes.get(interaction.channel.id).questionAnswered = false;

                        const newQuestionEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                            .setColor('#0099ff')
                            .setFooter({ text: '⏳ You have 30 seconds to answer this question.' });

                        interaction.followUp({ embeds: [newQuestionEmbed] });

                        startQuestionTimer();
                    }
                }, 30 * 1000);
            };

            startQuestionTimer();

            collector.on('collect', response => {
                const { commandUser, questionData } = activeQuizzes.get(interaction.channel.id);
                const userAnswer = parseInt(response.content.slice(1).trim(), 10);

                if (response.author.id === commandUser) {
                    if (userAnswer === questionData.answer) {
                        clearTimeout(activeQuizzes.get(interaction.channel.id).questionTimer);
                        activeQuizzes.get(interaction.channel.id).questionAnswered = true;

                        const correctEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription('✅ Correct! Here is a new question.')
                            .setColor('#00ff00');

                        interaction.followUp({ embeds: [correctEmbed] });

                        const newQuestion = generateQuestion();
                        activeQuizzes.get(interaction.channel.id).questionData = newQuestion;

                        const newQuestionEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                            .setColor('#0099ff')
                            .setFooter({ text: '⏳ You have 30 seconds to answer this question.' });

                        interaction.followUp({ embeds: [newQuestionEmbed] });

                        startQuestionTimer();
                    } else {
                        response.reply({ content: '❌ Incorrect answer! Try again.', ephemeral: true });
                    }
                } else {
                    response.reply({ content: '⛔ Only the command user can answer questions. Sorry, you cannot participate.', ephemeral: true });
                }
            });

            collector.on('end', collected => {
                clearTimeout(activeQuizzes.get(interaction.channel.id).questionTimer);
                activeQuizzes.delete(interaction.channel.id);

                const endEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz Ended ⏳')
                    .setDescription('The quiz has ended. Thanks for participating!')
                    .setColor('#ff0000');

                interaction.followUp({ embeds: [endEmbed] });
            });
        } else if (subcommand === 'endgame') {
            const quizData = activeQuizzes.get(interaction.channel.id);

            if (quizData && quizData.commandUser === interaction.user.id) {
                clearTimeout(quizData.questionTimer);
                quizData.collector.stop(); // Stop collecting messages

                activeQuizzes.delete(interaction.channel.id);

                const endEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz Ended ⏳')
                    .setDescription('The quiz has been ended by the command user.')
                    .setColor('#ff0000');

                await interaction.reply({ embeds: [endEmbed] });
            } else {
                await interaction.reply({ content: 'You are not authorized to end this quiz.', ephemeral: true });
            }
        }
    },
};
