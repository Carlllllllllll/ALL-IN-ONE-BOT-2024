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
        if (activeQuizzes.has(interaction.channel.id)) {
            await interaction.followUp('There is already an active quiz in this channel.');
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

        await interaction.followUp({ embeds: [quizEmbed] });

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
            activeQuizzes.delete(interaction.channel.id);

            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle("Time's up! ⏳")
                    .setDescription(`The time to answer has expired. The last question was: What is ${question}?`)
                    .setColor('#ff0000');

                interaction.followUp({ embeds: [timeoutEmbed] });
            }
        });
    },
};
