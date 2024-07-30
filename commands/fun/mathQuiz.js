const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const { MessageCollector } = require('discord.js');

let activeQuizzes = new Map();

function generateQuestion() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    const question = `${num1} + ${num2}`;
    return { question, answer };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mathquiz')
        .setDescription('Start a math quiz in this channel.'),
    async execute(interaction) {
        try {
            const channelId = interaction.channel.id;
            const userId = interaction.user.id;

            if (activeQuizzes.has(channelId)) {
                await interaction.reply({ content: 'There is already an active quiz in this channel.', ephemeral: true });
                return;
            }

            activeQuizzes.set(channelId, {
                commandUser: userId,
                questionData: generateQuestion(),
                collector: null,
                questionTimer: null,
                questionAnswered: false
            });

            const { question } = activeQuizzes.get(channelId).questionData;
            const color = 0x0099ff; // Color as a numeric value

            const quizEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                .setColor(color)
                .setFooter({ text: '⏳ You have 3 minutes to answer this question.' });

            await interaction.reply({ embeds: [quizEmbed] });

            const filter = response => {
                return response.content.startsWith('!') &&
                    response.author.id !== interaction.client.user.id &&
                    !isNaN(response.content.slice(1).trim()) &&
                    response.channel.id === channelId;
            };

            const collector = new MessageCollector(interaction.channel, { filter, time: 3 * 60 * 1000 });
            activeQuizzes.get(channelId).collector = collector;

            const startQuestionTimer = () => {
                const { answer } = activeQuizzes.get(channelId).questionData;

                activeQuizzes.get(channelId).questionTimer = setTimeout(() => {
                    if (!activeQuizzes.get(channelId).questionAnswered) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setTitle('Time\'s up for this question! ⏳')
                            .setDescription(`The correct answer was: ${answer}. The quiz has now ended.`)
                            .setColor(0xff0000); // Color as a numeric value

                        interaction.followUp({ embeds: [timeoutEmbed] });

                        // Remove the quiz from activeQuizzes
                        activeQuizzes.delete(channelId);

                        // Inform users that no more questions will be asked
                        const endGameEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz Ended ⏳')
                            .setDescription('The quiz has ended. Thank you for participating!')
                            .setColor(0xff0000); // Color as a numeric value

                        interaction.followUp({ embeds: [endGameEmbed] });
                    }
                }, 3 * 60 * 1000); // 3 minutes
            };

            startQuestionTimer();

            collector.on('collect', response => {
                const { commandUser, questionData } = activeQuizzes.get(channelId);
                const userAnswer = parseInt(response.content.slice(1).trim(), 10);

                if (response.author.id === commandUser) {
                    if (userAnswer === questionData.answer) {
                        clearTimeout(activeQuizzes.get(channelId).questionTimer);
                        activeQuizzes.get(channelId).questionAnswered = true;

                        const correctEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription('✅ Correct! Here is the next question.')
                            .setColor(color);

                        interaction.followUp({ embeds: [correctEmbed] });

                        const newQuestion = generateQuestion();
                        activeQuizzes.get(channelId).questionData = newQuestion;
                        activeQuizzes.get(channelId).questionAnswered = false;

                        const newQuestionEmbed = new EmbedBuilder()
                            .setTitle('Math Quiz 🧠')
                            .setDescription(`**New Question:** What is ${newQuestion.question}? Respond with \`!<your answer>\``)
                            .setColor(color)
                            .setFooter({ text: '⏳ You have 3 minutes to answer this question.' });

                        interaction.followUp({ embeds: [newQuestionEmbed] });

                        startQuestionTimer();
                    } else {
                        interaction.followUp('❌ Incorrect answer! Try again.');
                    }
                } else {
                    interaction.followUp({ content: '🔒 Only the quiz starter can answer the quiz.', ephemeral: true });
                }
            });

            collector.on('end', collected => {
                clearTimeout(activeQuizzes.get(channelId).questionTimer);
                activeQuizzes.delete(channelId);

                const endEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz Ended ⏳')
                    .setDescription('The quiz has ended. Thanks for participating!')
                    .setColor(0xff0000); // Color as a numeric value

                interaction.followUp({ embeds: [endEmbed] });
            });

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
