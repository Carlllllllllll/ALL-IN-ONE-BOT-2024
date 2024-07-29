const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, Colors, Events } = require('discord.js');

let mathQuizActive = false;
let correctAnswer = null;
let currentChannel = null;
let quizTimeout = null;

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

        if (subcommand === 'start') {
            if (mathQuizActive) {
                return interaction.reply('A math quiz is already active!');
            }
            startMathQuiz(interaction);
        } else if (subcommand === 'end') {
            if (!mathQuizActive) {
                return interaction.reply('There is no active math quiz.');
            }
            endMathQuiz(interaction);
        }
    }
};

function startMathQuiz(interaction) {
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;
    correctAnswer = num1 + num2;

    mathQuizActive = true;
    currentChannel = interaction.channel;

    const embed = new EmbedBuilder()
        .setTitle('Math Quiz Started! 🎉')
        .setDescription(`What is ${num1} + ${num2}? 🤔\n\nType your answer directly in this channel.`)
        .setColor(Colors.Blue);

    interaction.reply({ embeds: [embed] });

    
    quizTimeout = setTimeout(() => {
        if (mathQuizActive) {
            endMathQuiz(interaction, 'No one answered in time. The quiz has ended.');
        }
    }, 180000);
}

function checkAnswer(message) {
    if (message.channel !== currentChannel) return;
    const userAnswer = parseInt(message.content, 10);
    if (isNaN(userAnswer)) return;

    if (userAnswer === correctAnswer) {
        clearTimeout(quizTimeout);
        startNextQuiz(message);
    } else {
        message.reply(`Incorrect. 😔 Try again!`);
    }
}

function startNextQuiz(message) {
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;
    correctAnswer = num1 + num2;

    const embed = new EmbedBuilder()
        .setTitle('Correct! 🎉 Here\'s your next question:')
        .setDescription(`What is ${num1} + ${num2}? 🤔\n\nType your answer directly in this channel.`)
        .setColor(Colors.Green);

    message.channel.send({ embeds: [embed] });

   
    quizTimeout = setTimeout(() => {
        if (mathQuizActive) {
            endMathQuiz(message, 'No one answered in time. The quiz has ended.');
        }
    }, 180000);
}

function endMathQuiz(interaction, endMessage = 'Math quiz ended.') {
    mathQuizActive = false;
    correctAnswer = null;
    currentChannel = null;
    clearTimeout(quizTimeout);

    const embed = new EmbedBuilder()
        .setTitle('Math Quiz Ended')
        .setDescription(endMessage)
        .setColor(Colors.Red);

    interaction.reply({ embeds: [embed] });
}


client.on(Events.MessageCreate, message => {
    if (mathQuizActive) {
        checkAnswer(message);
    }
});
