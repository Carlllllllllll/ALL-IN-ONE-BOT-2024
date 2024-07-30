const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { MessageCollector } = require('discord.js');

let activeQuizzes = new Map();

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
        .setDescription('Start or end a math quiz.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a math quiz in this channel.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('endgame')
                .setDescription('End the current math quiz.')
        ),
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const channelId = interaction.channel.id;
            const userId = interaction.user.id;

            if (subcommand === 'start') {
                if (activeQuizzes.has(channelId)) {
                    await interaction.reply({ content: 'There is already an active quiz in this channel.', ephemeral: true });
                    return;
                }

                const quizData = {
                    commandUser: userId,
                    questionData: generateQuestion(),
                    collector: null,
                    questionTimer: null,
                    questionAnswered: false,
                    overallTimer: setTimeout(() => {
                        endQuiz(channelId, 'The overall quiz time of 3 minutes has ended.');
                    }, 3 * 60 * 1000)
                };
                activeQuizzes.set(channelId, quizData);

                const { question } = quizData.questionData;
                const color = '0099ff'; // Updated to remove the #

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
                        response.channel.id === channelId;
                };

                const collector = new MessageCollector(interaction.channel, { filter, time: 3 * 60 * 1000 });
                quizData.collector = collector;

                const startQuestionTimer = () => {
                    const { answer } = quizData.questionData;

                    quizData.questionTimer = setTimeout(() => {
                        if (!quizData.questionAnswered) {
                            const timeoutEmbed = new EmbedBuilder()
                                .setTitle('Time\'s up for this question! ⏳')
                                .setDescription(`The correct answer was: ${answer}. Here is a new question.`)
                                .setColor('ff0000'); // Updated to remove the #

                            interaction.followUp({ embeds: [timeoutEmbed] });

                            const newQuestion = generateQuestion();
                            quizData.questionData = newQuestion;
                            quizData.questionAnswered = false;

                            const newQuestionEmbed = new EmbedBuilder()
                                .setTitle('Math Quiz 🧠')
                                .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                                .setColor('0099ff') // Updated to remove the #
                                .setFooter({ text: '⏳ You have 30 seconds to answer this question.' });

                            interaction.followUp({ embeds: [newQuestionEmbed] });

                            startQuestionTimer();
                        }
                    }, 30 * 1000);
                };

                startQuestionTimer();

                collector.on('collect', response => {
                    const { commandUser, questionData } = quizData;
                    const userAnswer = parseInt(response.content.slice(1).trim(), 10);

                    if (userAnswer === questionData.answer) {
                        clearTimeout(quizData.questionTimer);
                        quizData.questionAnswered = true;

                        const correctEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription('✅ Correct! Here is the next question.')
                            .setColor('0099ff'); // Updated to remove the #

                        interaction.followUp({ embeds: [correctEmbed] });

                        const newQuestion = generateQuestion();
                        quizData.questionData = newQuestion;
                        quizData.questionAnswered = false;

                        const newQuestionEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                            .setColor('0099ff') // Updated to remove the #
                            .setFooter({ text: '⏳ You have 30 seconds to answer this question.' });

                        interaction.followUp({ embeds: [newQuestionEmbed] });

                        startQuestionTimer();
                    } else {
                        response.reply('❌ Incorrect answer! Try again.');
                    }
                });

                collector.on('end', () => {
                    endQuiz(channelId, 'The quiz has ended. Thanks for participating!');
                });

            } else if (subcommand === 'endgame') {
                if (!activeQuizzes.has(channelId)) {
                    await interaction.reply({ content: 'There is no active quiz in this channel.', ephemeral: true });
                    return;
                }

                const { commandUser } = activeQuizzes.get(channelId);

                if (interaction.user.id !== commandUser) {
                    await interaction.reply({ content: '🔒 Only the quiz starter can end the quiz.', ephemeral: true });
                    return;
                }

                endQuiz(channelId, 'The quiz has been manually ended by the quiz starter.');
            }
        } catch (error) {
            console.error('Error executing math quiz command:', error);
            if (!interaction.replied) {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    },
};

function endQuiz(channelId, endMessage) {
    if (!activeQuizzes.has(channelId)) return;

    const quizData = activeQuizzes.get(channelId);

    clearTimeout(quizData.questionTimer);
    clearTimeout(quizData.overallTimer);
    quizData.collector.stop();

    activeQuizzes.delete(channelId);

    const endEmbed = new EmbedBuilder()
        .setTitle('Math Quiz Ended ⏳')
        .setDescription(endMessage)
        .setColor('ff0000'); // Updated to remove the #

    quizData.collector.channel.send({ embeds: [endEmbed] });
}
