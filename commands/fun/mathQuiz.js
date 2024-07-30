const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');

let activeQuizzes = new Map(); // Map to track active quizzes and their data

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
            if (activeQuizzes.has(interaction.channel.id)) {
                await interaction.reply('There is already an active quiz in this channel.');
                return;
            }

            // Start a new quiz
            let { question, answer } = generateQuestion();
            const color = parseInt('0099ff', 16);

            const quizEmbed = new EmbedBuilder()
                .setTitle('Math Quiz 🧠')
                .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                .setColor(color)
                .setFooter({ text: '⏳ You have 3 minutes to answer.' });

            await interaction.reply({ embeds: [quizEmbed] });

            // Store the quiz data in the activeQuizzes map
            activeQuizzes.set(interaction.channel.id, { answer, question });

            const filter = response => {
                return response.content.startsWith('!') && response.author.id !== interaction.client.user.id;
            };

            const collector = interaction.channel.createMessageCollector({ filter, time: 3 * 60 * 1000 });

            collector.on('collect', response => {
                const userAnswer = parseInt(response.content.slice(1).trim(), 10);
                if (userAnswer === activeQuizzes.get(interaction.channel.id).answer) {
                    const newQuestion = generateQuestion();
                    question = newQuestion.question;
                    answer = newQuestion.answer;

                    const correctEmbed = new EmbedBuilder()
                        .setTitle('Math Quiz 🧠')
                        .setDescription(`✅ Correct! New question: What is ${question}? Respond with \`!<your answer>\``)
                        .setColor(color)
                        .setFooter({ text: '⏳ You have 3 minutes to answer.' });

                    interaction.followUp({ embeds: [correctEmbed] });

                    // Update the quiz data in the map
                    activeQuizzes.set(interaction.channel.id, { answer, question });
                } else {
                    response.reply('❌ Incorrect answer! Try again.');
                }
            });

            collector.on('end', collected => {
                activeQuizzes.delete(interaction.channel.id);

                if (collected.size === 0) {
                    interaction.followUp({
                        embeds: [new EmbedBuilder()
                            .setTitle("Time's up! ⏳")
                            .setDescription(`The time to answer has expired. The last question was: What is ${question}?`)
                            .setColor('#ff0000')]
                    });
                }
            });
        } else if (interaction.commandName === 'mathquizend') {
            if (!activeQuizzes.has(interaction.channel.id)) {
                await interaction.reply('There is no active quiz in this channel to end.');
                return;
            }

            activeQuizzes.delete(interaction.channel.id);

            const endEmbed = new EmbedBuilder()
                .setTitle('Quiz Ended 🚫')
                .setDescription('The math quiz has been ended.')
                .setColor('#ff0000');

            await interaction.reply({ embeds: [endEmbed] });
        }
    },
};
