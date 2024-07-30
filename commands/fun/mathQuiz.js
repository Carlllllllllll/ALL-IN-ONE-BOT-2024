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
                const color = 0x0099ff; // Blue color for the question

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
                                .setColor(0xff0000); // Red color for timeout

                            interaction.followUp({ embeds: [timeoutEmbed] });

                            const newQuestion = generateQuestion();
                            quizData.questionData = newQuestion;
                            quizData.questionAnswered = false;

                            const newQuestionEmbed = new EmbedBuilder()
                                .setTitle('Math Quiz 🧠')
                                .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                                .setColor(0x0099ff) // Blue color for the new question
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
                            .setColor(0x0099ff); // Blue color for correct answers

                        interaction.followUp({ embeds: [correctEmbed] });

                        const newQuestion = generateQuestion();
                        quizData.questionData = newQuestion;
                        quizData.questionAnswered = false;

                        const newQuestionEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                            .setColor(0x0099ff) // Blue color for the new question
                            .setFooter({ text: '⏳ You have 30 seconds to answer this question.' });

                        interaction.followUp({ embeds: [newQuestionEmbed] });

                        startQuestionTimer();
                    }
                });
            } else if (subcommand === 'endgame') {
                if (!activeQuizzes.has(channelId)) {
                    await interaction.reply({ content: 'There is no active quiz in this channel.', ephemeral: true });
                    return;
                }

                const quizData = activeQuizzes.get(channelId);
                clearTimeout(quizData.questionTimer);
                clearTimeout(quizData.overallTimer);
                quizData.collector.stop();

                activeQuizzes.delete(channelId);

                await interaction.reply({ content: 'The math quiz has been ended.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error executing math quiz command:', error);
            await interaction.reply({ content: 'There was an error while executing the command.', ephemeral: true });
        }
    }
};

function endQuiz(channelId, reason) {
    if (activeQuizzes.has(channelId)) {
        const quizData = activeQuizzes.get(channelId);
        clearTimeout(quizData.questionTimer);
        clearTimeout(quizData.overallTimer);
        quizData.collector.stop();

        activeQuizzes.delete(channelId);

        const endEmbed = new EmbedBuilder()
            .setTitle('Math Quiz Ended')
            .setDescription(reason)
            .setColor(0xff0000); // Red color for quiz end

        quizData.collector.channel.send({ embeds: [endEmbed] });
    }
}
