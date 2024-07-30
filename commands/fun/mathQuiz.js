const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { MessageCollector } = require('discord.js');

let activeQuizzes = new Map();

function generateQuestion() {
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;
    const operations = ['+', '-'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let question, answer;

    switch (operation) {
        case '+':
            question = `${num1} + ${num2}`;
            answer = num1 + num2;
            break;
        case '-':
            if (num1 < num2) {
                [num1, num2] = [num2, num1];
            }
            question = `${num1} - ${num2}`;
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
                .setName('end')
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

                await interaction.deferReply();
                const quizData = {
                    commandUser: userId,
                    questionData: generateQuestion(),
                    collector: null,
                    questionTimer: null,
                    questionAnswered: false,
                    overallTimer: setTimeout(() => {
                        endQuiz(interaction, channelId, 'Time\'s up! The overall quiz time of 2 minutes has ended.');
                    }, 2 * 60 * 1000)
                };
                activeQuizzes.set(channelId, quizData);

                const { question } = quizData.questionData;
                const blueColor = 0x0099ff;

                const quizEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz 🧠')
                    .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                    .setColor(blueColor)
                    .setFooter({ text: '⏳ You have 2 minutes to answer this question.' });

                await interaction.editReply({ embeds: [quizEmbed] });

                const filter = response => {
                    return response.content.startsWith('!') &&
                           response.author.id !== interaction.client.user.id &&
                           !isNaN(response.content.slice(1).trim()) &&
                           response.channel.id === channelId;
                };

                const collector = new MessageCollector(interaction.channel, { filter, time: 2 * 60 * 1000 });
                quizData.collector = collector;

                const startQuestionTimer = () => {
                    const { answer } = quizData.questionData;

                    quizData.questionTimer = setTimeout(async () => {
                        if (!quizData.questionAnswered) {
                            try {
                                const timeoutEmbed = new EmbedBuilder()
                                    .setTitle('Time\'s Up! ⏳')
                                    .setDescription(`The correct answer was: ${answer}. Here is a new question.`)
                                    .setColor(0xff0000);

                                await interaction.followUp({ embeds: [timeoutEmbed] });

                                const newQuestion = generateQuestion();
                                quizData.questionData = newQuestion;
                                quizData.questionAnswered = false;

                                const newQuestionEmbed = new EmbedBuilder()
                                    .setTitle('Math Quiz 🧠')
                                    .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                                    .setColor(0x0099ff)
                                    .setFooter({ text: '⏳ You have 2 minutes to answer this question.' });

                                await interaction.followUp({ embeds: [newQuestionEmbed] });

                                startQuestionTimer();
                            } catch (error) {
                                console.error('Error sending timeout message:', error);
                            }
                        }
                    }, 2 * 60 * 1000);
                };

                startQuestionTimer();

                collector.on('collect', async response => {
                    const { answer } = quizData.questionData;
                    const userAnswer = parseInt(response.content.slice(1).trim(), 10);

                    if (userAnswer === answer) {
                        clearTimeout(quizData.questionTimer);
                        quizData.questionAnswered = true;

                        try {
                            const correctEmbed = new EmbedBuilder()
                                .setTitle('Math Quiz 🧠')
                                .setDescription('✅ Correct! Here is the next question.')
                                .setColor(0x0099ff);

                            await interaction.followUp({ embeds: [correctEmbed] });

                            const newQuestion = generateQuestion();
                            quizData.questionData = newQuestion;
                            quizData.questionAnswered = false;

                            const newQuestionEmbed = new EmbedBuilder()
                                .setTitle('Math Quiz 🧠')
                                .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                                .setColor(0x0099ff)
                                .setFooter({ text: '⏳ You have 2 minutes to answer this question.' });

                            await interaction.followUp({ embeds: [newQuestionEmbed] });

                            startQuestionTimer();
                        } catch (error) {
                            console.error('Error sending correct answer message:', error);
                        }
                    } else {
                        await response.reply({ content: '❌ Incorrect answer! Try again.', ephemeral: true });
                    }
                });

                collector.on('end', async collected => {
                    if (quizData.overallTimer) {
                        clearTimeout(quizData.overallTimer);
                    }
                    await endQuiz(interaction, channelId, 'The quiz has ended.');
                });
            } else if (subcommand === 'end') {
                await interaction.deferReply();

                await endQuiz(interaction, channelId, `${interaction.user} ended the game.`);

                await interaction.followUp({ content: 'The game has ended.' });
            }
        } catch (error) {
            console.error('Error executing math quiz command:', error);
        }
    }
};

async function endQuiz(interaction, channelId, reason) {
    const quizData = activeQuizzes.get(channelId);

    if (quizData) {
        if (quizData.collector) {
            quizData.collector.stop();
        }
        if (quizData.questionTimer) {
            clearTimeout(quizData.questionTimer);
        }
        if (quizData.overallTimer) {
            clearTimeout(quizData.overallTimer);
        }
        activeQuizzes.delete(channelId);

        const channel = await interaction.client.channels.fetch(channelId);
        if (channel) {
            const endEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription(reason)
                .setColor(0xff0000);

            await channel.send({ embeds: [endEmbed] });
        }
    } else {
        const channel = await interaction.client.channels.fetch(channelId);
        if (channel) {
            const noQuizEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription('There is no active quiz to end.')
                .setColor(0xff0000);

            await channel.send({ embeds: [noQuizEmbed] });
        }
    }
}
