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
        .setDescription('Start a math quiz in this channel.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new math quiz in this channel.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End the current math quiz in this channel.')
        ),
    async execute(interaction) {
        const channelId = interaction.channel.id;
        const userId = interaction.user.id;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'start') {
            // Check if there's already an active quiz in this channel
            if (activeQuizzes.has(channelId)) {
                return interaction.reply({ content: 'There is already an active quiz in this channel.', ephemeral: true });
            }

            // Set up a new quiz
            const questionData = generateQuestion();
            activeQuizzes.set(channelId, {
                commandUser: userId,
                questionData,
                collector: null,
                questionTimer: null,
                questionAnswered: false
            });

            const { question, answer } = questionData;
            const color = 0x0099ff; // Color as a numeric value

            const quizEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                .setColor(color)
                .setFooter({ text: '⏳ You have 3 minutes to answer this question.' });

            // Reply with the quiz question
            await interaction.reply({ embeds: [quizEmbed] });

            // Set up message collector
            const filter = response => {
                return response.content.startsWith('!') &&
                    response.author.id !== interaction.client.user.id &&
                    !isNaN(response.content.slice(1).trim()) &&
                    response.channel.id === channelId;
            };

            const collector = new MessageCollector(interaction.channel, { filter, time: 3 * 60 * 1000 });
            activeQuizzes.get(channelId).collector = collector;

            // Timer for question timeout
            const startQuestionTimer = () => {
                const { answer } = questionData;

                activeQuizzes.get(channelId).questionTimer = setTimeout(() => {
                    if (!activeQuizzes.get(channelId).questionAnswered) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setTitle('Time\'s up for this question! ⏳')
                            .setDescription(`The correct answer was: ${answer}. The quiz has now ended.`)
                            .setColor(0xff0000); // Color as a numeric value

                        interaction.channel.send({ embeds: [timeoutEmbed] });
                        activeQuizzes.delete(channelId);
                    }
                }, 3 * 60 * 1000); // 3 minutes
            };

            startQuestionTimer();

            collector.on('collect', message => {
                if (message.content.slice(1).trim() == questionData.answer) {
                    // Correct answer
                    activeQuizzes.get(channelId).questionAnswered = true;
                    clearTimeout(activeQuizzes.get(channelId).questionTimer);
                    collector.stop();

                    const correctEmbed = new EmbedBuilder()
                        .setTitle('Correct Answer! ✅')
                        .setDescription(`The correct answer was ${questionData.answer}. Well done!`)
                        .setColor(0x00ff00); // Color as a numeric value

                    interaction.channel.send({ embeds: [correctEmbed] });
                    activeQuizzes.delete(channelId);
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle('Time\'s up for this question! ⏳')
                        .setDescription(`The correct answer was: ${questionData.answer}. The quiz has now ended.`)
                        .setColor(0xff0000); // Color as a numeric value

                    interaction.channel.send({ embeds: [timeoutEmbed] });
                    activeQuizzes.delete(channelId);
                }
            });
        } else if (subcommand === 'end') {
            // End the current quiz
            if (!activeQuizzes.has(channelId)) {
                return interaction.reply({ content: 'There is no active quiz in this channel.', ephemeral: true });
            }

            const quizData = activeQuizzes.get(channelId);
            if (quizData.commandUser !== userId) {
                return interaction.reply({ content: 'Only the quiz starter can end the quiz.', ephemeral: true });
            }

            clearTimeout(quizData.questionTimer);
            quizData.collector.stop();

            const endEmbed = new EmbedBuilder()
                .setTitle('Quiz Ended! ❌')
                .setDescription('The quiz has been ended by the command user.')
                .setColor(0xff0000); // Color as a numeric value

            await interaction.reply({ embeds: [endEmbed] });
            activeQuizzes.delete(channelId);
        }
    },
};
