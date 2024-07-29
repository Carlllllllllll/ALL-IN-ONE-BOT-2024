const { MessageActionRow, MessageButton } = require('discord.js');
const { Client, GatewayIntentBits } = require('discord.js');
const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
client.commands = new Collection();

// Utility to generate random math questions
function generateQuestion() {
    const operators = ['+', '-', '*', '/'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const num1 = Math.floor(Math.random() * 100) + 1;
    const num2 = Math.floor(Math.random() * 100) + 1;

    let question = '';
    let answer = 0;

    switch (operator) {
        case '+':
            question = `${num1} + ${num2}`;
            answer = num1 + num2;
            break;
        case '-':
            question = `${num1} - ${num2}`;
            answer = num1 - num2;
            break;
        case '*':
            question = `${num1} * ${num2}`;
            answer = num1 * num2;
            break;
        case '/':
            question = `${num1} / ${num2}`;
            answer = Math.round(num1 / num2);
            break;
    }

    return { question, answer };
}

// Command to start a math quiz
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!math')) {
        const { question, answer } = generateQuestion();
        const emoji = '🧠'; // Emoji to represent the quiz

        message.channel.send(`**Math Quiz ${emoji}:** What is ${question}?`)
            .then(() => {
                client.once('messageCreate', responseMessage => {
                    if (responseMessage.author.id === message.author.id) {
                        const userAnswer = parseInt(responseMessage.content.replace('!', '').trim(), 10);
                        if (userAnswer === answer) {
                            message.channel.send(`🎉 Correct! The answer is ${answer}.`);
                        } else {
                            message.channel.send(`❌ Wrong! The correct answer was ${answer}.`);
                        }
                    }
                });
            });
    }
});

module.exports = client;
