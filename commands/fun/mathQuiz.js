const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');

function generateQuestion() {
    const num1 = Math.floor(Math.random() * 500) + 1;
    const num2 = Math.floor(Math.random() * 500) + 1;
    const operations = ['+', '-', '*'];
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
        case '*':
            answer = num1 * num2;
            break;
    }

    return { question, answer };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mathquiz')
        .setDescription('Start a math quiz!'),
    async execute(interaction) {
        let { question, answer } = generateQuestion();

        const color = parseInt('0099ff', 16);

        const quizEmbed = new EmbedBuilder()
            .setTitle('Math Quiz 🧠')
            .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
            .setColor(color)
            .setFooter({ text: '⏳ You have 3 minutes to answer.' });

        const quizMessage = await interaction.reply({ embeds: [quizEmbed], fetchReply: true });

        const filter = response => {
            return response.content.startsWith('!') && response.author.id !== interaction.client.user.id;
        };

        const collector = interaction.channel.createMessageCollector({ filter, time: 3 * 60 * 1000 });

        collector.on('collect', response => {
            const userAnswer = parseInt(response.content.slice(1).trim(), 10);
            if (userAnswer === answer) {
                const correctEmbed = new EmbedBuilder()
                    .setTitle('Correct! ✅')
                    .setDescription(`The answer was ${answer}. Great job, ${response.author.username}!`)
                    .setColor('#00ff00');

                response.reply({ embeds: [correctEmbed] });

                // Generate a new question and update the quiz message
                ({ question, answer } = generateQuestion());
                const newQuizEmbed = new EmbedBuilder()
                    .setTitle('Math Quiz 🧠')
                    .setDescription(`**Question:** What is ${question}? Respond with \`!<your answer>\``)
                    .setColor(color)
                    .setFooter({ text: '⏳ You have 3 minutes to answer.' });

                interaction.channel.send({ embeds: [newQuizEmbed] }).then(newQuizMessage => {
                    quizMessage.delete();
                    quizMessage = newQuizMessage;
                });
            } else {
                response.reply('❌ Incorrect answer! Try again.');
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle("Time's up! ⏳")
                    .setDescription(`The time to answer has expired. The correct answer was ${answer}.`)
                    .setColor('#ff0000');

                interaction.channel.send({ embeds: [timeoutEmbed] });
                quizMessage.delete();
            }
        });
    },
};
