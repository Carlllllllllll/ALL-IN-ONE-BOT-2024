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
                return interaction.reply('A math quiz is already active in this channel!');
            }
            startMathQuiz(interaction, channelId);
        } else if (subcommand === 'end') {
            if (!quizzes.has(channelId)) {
                return interaction.reply('There is no active math quiz in this channel.');
            }
            endMathQuiz(interaction, channelId);
        }
    }
};

function startMathQuiz(interaction, channelId) {
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;
    const correctAnswer = num1 + num2;

    quizzes.set(channelId, { correctAnswer, timeout: null });

    const embed = new EmbedBuilder()
        .setTitle('Math Quiz Started! 🎉')
        .setDescription(`What is ${num1} + ${num2}? 🤔\n\nType your answer directly in this channel.`)
        .setColor(Colors.Blue);

    interaction.reply({ embeds: [embed] });

    // Set a timeout to end the quiz if no one answers in 3 minutes (180000 milliseconds)
    const timeout = setTimeout(() => {
        if (quizzes.has(channelId)) {
            endMathQuiz(interaction, channelId, 'No one answered in time. The quiz has ended.');
        }
    }, 180000);

    quizzes.get(channelId).timeout = timeout;
}

function checkAnswer(message) {
    const channelId = message.channel.id;
    const quiz = quizzes.get(channelId);
    if (!quiz || message.author.bot) return; // Ignore bot messages

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
            endMathQuiz(message, channelId, 'No one answered in time. The quiz has ended.');
        }
    }, 180000);

    quizzes.get(channelId).timeout = timeout;
}

function endMathQuiz(interaction, channelId, endMessage = 'Math quiz ended.') {
    quizzes.delete(channelId);
    clearTimeout(quizzes.get(channelId)?.timeout);

    const embed = new EmbedBuilder()
        .setTitle('Math Quiz Ended')
        .setDescription(endMessage)
        .setColor(Colors.Red);

    interaction.reply({ embeds: [embed] });
}

// Add this to your bot's main file to listen for messages
client.on(Events.MessageCreate, message => {
    if (quizzes.has(message.channel.id)) {
        checkAnswer(message);
    }
});
