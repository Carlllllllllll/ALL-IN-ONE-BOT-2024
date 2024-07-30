const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');

let activeQuizzes = new Set();

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
        .setDescription('Start a math quiz!'),
    async execute(interaction) {
        if (interaction.commandName === 'mathquiz') {
            // Handle the start of the quiz
            if (activeQuizzes.has(interaction.channel.id)) {
                if (!interaction.replied) {
                    await interaction.reply('There is already an active quiz in this channel.');
                } else {
                    await interaction.followUp('There is already an active quiz in this channel.');
                }
                return;
            }

            activeQuizzes.add(interaction.channel.id);

            let { question, answer } = generateQuestion();
            const color = parseInt('0099ff', 16);

            const quizEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                .setColor(color)
                .setFooter({ text: '⏳ You have 3 minutes to answer.' });

            if (!interaction.replied) {
                await interaction.reply({ embeds: [quizEmbed] });
            } else {
                await interaction.followUp({ embeds: [quizEmbed] });
            }

            const filter = response => {
                return response.content.startsWith('!') && response.author.id !== interaction.client.user.id;
            };

            const collector = interaction.channel.createMessageCollector({ filter, time: 3 * 60 * 1000 });

            collector.on('collect', response => {
                const userAnswer = parseInt(response.content.slice(1).trim(), 10);
                if (userAnswer === answer) {
                    const newQuestion = generateQuestion();
                    question = newQuestion.question;
                    answer = newQuestion.answer;

                    const correctEmbed = new EmbedBuilder()
                        .setTitle('Math Quiz 🧠')
                        .setDescription(`✅ Correct! New question: What is ${question}? Respond with \`!<your answer>\``)
                        .setColor(color)
                        .setFooter({ text: '⏳ You have 3 minutes to answer.' });

                    if (!interaction.replied) {
                        interaction.reply({ embeds: [correctEmbed] });
                    } else {
                        interaction.followUp({ embeds: [correctEmbed] });
                    }
                }
            });

            collector.on('end', collected => {
                activeQuizzes.delete(interaction.channel.id);

                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle("Time's up! ⏳")
                        .setDescription(`The time to answer has expired. The last question was: What is ${question}?`)
                        .setColor('#ff0000');

                    if (!interaction.replied) {
                        interaction.reply({ embeds: [timeoutEmbed] });
                    } else {
                        interaction.followUp({ embeds: [timeoutEmbed] });
                    }
                }
            });
        } else if (interaction.commandName === 'mathquizend') {
            // Handle the end of the quiz
            if (!activeQuizzes.has(interaction.channel.id)) {
                if (!interaction.replied) {
                    await interaction.reply('There is no active quiz in this channel.');
                } else {
                    await interaction.followUp('There is no active quiz in this channel.');
                }
                return;
            }

            activeQuizzes.delete(interaction.channel.id);

            const endEmbed = new EmbedBuilder()
                .setTitle('Quiz Ended 🚫')
                .setDescription('The math quiz has been ended.')
                .setColor('#ff0000');

            if (!interaction.replied) {
                await interaction.reply({ embeds: [endEmbed] });
            } else {
                await interaction.followUp({ embeds: [endEmbed] });
            }
        }
    },
};
