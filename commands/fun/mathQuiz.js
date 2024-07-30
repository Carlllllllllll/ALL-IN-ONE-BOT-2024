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
        .setDescription('Start or end a math quiz!')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'Start Quiz', value: 'start' },
                    { name: 'End Quiz', value: 'end' }
                )),
    async execute(interaction) {
        const action = interaction.options.getString('action');
        const channelId = interaction.channel.id;

        if (action === 'start') {
            if (activeQuizzes.has(channelId)) {
                await interaction.reply('There is already an active quiz in this channel.');
                return;
            }

            activeQuizzes.add(channelId);

            let { question, answer } = generateQuestion();
            const color = '#0099ff'; // Color in hex format

            const quizEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                .setColor(color)
                .setFooter({ text: '⏳ You have 3 minutes to answer.' });

            await interaction.reply({ embeds: [quizEmbed] });

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

                    interaction.followUp({ embeds: [correctEmbed] });
                } else {
                    response.reply('❌ Incorrect answer! Try again.');
                }
            });

            collector.on('end', collected => {
                activeQuizzes.delete(channelId);

                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle("Time's up! ⏳")
                        .setDescription(`The time to answer has expired. The last question was: What is ${question}?`)
                        .setColor('#ff0000');

                    interaction.followUp({ embeds: [timeoutEmbed] });
                }
            });

        } else if (action === 'end') {
            if (!activeQuizzes.has(channelId)) {
                await interaction.reply('There is no active quiz in this channel.');
                return;
            }

            activeQuizzes.delete(channelId);

            const endEmbed = new EmbedBuilder()
                .setTitle('Math Quiz Ended')
                .setDescription('The math quiz has been ended.')
                .setColor('#ff0000');

            await interaction.reply({ embeds: [endEmbed] });
        }
    },
};
