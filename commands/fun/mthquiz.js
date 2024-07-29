const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, Colors, Events } = require('discord.js');

const quizzes = new Map(); // To store quiz state per channel

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mathquiz')
        .setDescription('Starts a math quiz game')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a new math quiz'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End the current math quiz')),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const channelId = interaction.channel.id;

        if (subcommand === 'start') {
            if (quizzes.has(channelId)) {
                return interaction.reply({ content: 'A math quiz is already active in this channel!', ephemeral: true });
            }
            await startMathQuiz(interaction, channelId);
        } else if (subcommand === 'end') {
            if (!quizzes.has(channelId)) {
                return interaction.reply({ content: 'There is no active math quiz in this channel.', ephemeral: true });
            }
            await endMathQuiz(interaction, channelId);
        }
    }
};

async function startMathQuiz(interaction, channelId) {
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;
    const correctAnswer = num1 + num2;

    quizzes.set(channelId, { correctAnswer, timeout: null });

    const embed = new EmbedBuilder()
        .setTitle('Math Quiz Started! 🎉')
        .setDescription(`What is ${num1} + ${num2}? 🤔\n\nType your answer directly in this channel.`)
        .setColor(Colors.Blue);

    await interaction.reply({ embeds: [embed] });

    // Set a timeout to end the quiz if no one answers in 3 minutes (180000 milliseconds)
    const timeout = setTimeout(() => {
        if (quizzes.has(channelId)) {
            endMathQuiz(null, channelId, 'No one answered in time. The quiz has ended.');
        }
    }, 180000);

    quizzes.get(channelId).timeout = timeout;
}

// Ensure your bot is listening to messages in your main bot file
client.on(Events.MessageCreate, message => {
    if (!message.author.bot) {
        checkAnswer(message);
    }
});

function checkAnswer(message) {
    const channelId = message.channel.id;
    const quiz = quizzes.get(channelId);
    if (!quiz) return; // Ignore if there's no active quiz in this channel

    const userAnswer = parseInt(message.content, 10);
    if (isNaN(userAnswer)) return;

    if (userAnswer === quiz.correctAnswer) {
        clearTimeout(quiz.timeout);
        startNextQuiz(message, channelId);
    } else {
        message.reply(`Incorrect. 😔 Try again!`);
    }
}

function startNextQuiz(message, channelId) {
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;
    const correctAnswer = num1 + num2;

    quizzes.get(channelId).correctAnswer = correctAnswer;

    const embed = new EmbedBuilder()
        .setTitle('Correct! 🎉 Here\'s your next question:')
        .setDescription(`What is ${num1} + ${num2}? 🤔\n\nType your answer directly in this channel.`)
        .setColor(Colors.Green);

    message.channel.send({ embeds: [embed] });

    // Reset the timeout for the new question
    const timeout = setTimeout(() => {
        if (quizzes.has(channelId)) {
            endMathQuiz(null, channelId, 'No one answered in time. The quiz has ended.');
        }
    }, 180000);

    quizzes.get(channelId).timeout = timeout;
}

async function endMathQuiz(interaction, channelId, endMessage = 'Math quiz ended.') {
    const quiz = quizzes.get(channelId);
    if (!quiz) return;

    quizzes.delete(channelId);
    clearTimeout(quiz.timeout);

    const embed = new EmbedBuilder()
        .setTitle('Math Quiz Ended')
        .setDescription(endMessage)
        .setColor(Colors.Red);

    if (interaction) {
        await interaction.reply({ embeds: [embed] });
    } else {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            channel.send({ embeds: [embed] });
        }
    }
}
