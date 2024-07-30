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

                await interaction.deferReply(); // Defers the reply to handle processing time
                const quizData = {
                    commandUser: userId,
                    questionData: generateQuestion(),
                    collector: null,
                    questionTimer: null,
                    questionAnswered: false,
                    overallTimer: setTimeout(() => {
                        endQuiz(channelId, 'Time\'s up! The overall quiz time of 2 minutes has ended.');
                    }, 2 * 60 * 1000) // 2 minutes
                };
                activeQuizzes.set(channelId, quizData);

                const { question } = quizData.questionData;
                const blueColor = 0x0099ff; // Blue color

                const quizEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz 🧠')
                    .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                    .setColor(blueColor)
                    .setFooter({ text: '⏳ You have 2 minutes to answer this question.' });

                const sentMessage = await interaction.editReply({ embeds: [quizEmbed] });

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

                    quizData.questionTimer = setTimeout(() => {
                        if (!quizData.questionAnswered) {
                            const timeoutEmbed = new EmbedBuilder()
                                .setTitle('Time\'s Up! ⏳')
                                .setDescription(`The correct answer was: ${answer}. Here is a new question.`)
                                .setColor(0xff0000); // Red color

                            interaction.followUp({ embeds: [timeoutEmbed] });

                            const newQuestion = generateQuestion();
                            quizData.questionData = newQuestion;
                            quizData.questionAnswered = false;

                            const newQuestionEmbed = new EmbedBuilder()
                                .setTitle('Math Quiz 🧠')
                                .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                                .setColor(blueColor)
                                .setFooter({ text: '⏳ You have 2 minutes to answer this question.' });

                            interaction.followUp({ embeds: [newQuestionEmbed] });

                            startQuestionTimer();
                        }
                    }, 2 * 60 * 1000); // 2 minutes per question
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
                            .setColor(blueColor);

                        interaction.followUp({ embeds: [correctEmbed] });

                        const newQuestion = generateQuestion();
                        quizData.questionData = newQuestion;
                        quizData.questionAnswered = false;

                        const newQuestionEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                            .setColor(blueColor)
                            .setFooter({ text: '⏳ You have 2 minutes to answer this question.' });

                        interaction.followUp({ embeds: [newQuestionEmbed] });

                        startQuestionTimer();
                    }
                });

                collector.on('end', collected => {
                    if (quizData.overallTimer) {
                        clearTimeout(quizData.overallTimer);
                    }
                    endQuiz(channelId, 'The quiz has ended.');
                });
            } else if (subcommand === 'end') {
                await interaction.deferReply(); // Defers the reply to handle processing time

                // End the quiz
                endQuiz(channelId, 'The game has ended by user request.');

                // Notify that the game has ended
                await interaction.followUp({ content: 'The game has ended.' });
            }
        } catch (error) {
            console.error('Error executing math quiz command:', error);
        }
    }
};

async function endQuiz(channelId, reason) {
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

        // Fetch the channel and delete all messages from the bot
        const channel = await interaction.client.channels.fetch(channelId);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 100 });
            messages.forEach(message => {
                if (message.author.id === interaction.client.user.id) {
                    message.delete().catch(console.error);
                }
            });

            // Send a new embed indicating that the quiz has timed out or ended
            const endEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription(reason)
                .setColor(0xff0000); // Red color

            await channel.send({ embeds: [endEmbed] });
        }
    } else {
        // Handle case where no quiz was active
        const channel = await interaction.client.channels.fetch(channelId);
        if (channel) {
            const noQuizEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription('There is no active quiz to end.')
                .setColor(0xff0000); // Red color

            await channel.send({ embeds: [noQuizEmbed] });
        }
    }
}
