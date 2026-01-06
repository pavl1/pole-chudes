import {createApp} from 'https://unpkg.com/petite-vue?module';

const storageKey = 'wheelOfFortune';
const channelName = 'controlChannel';

createApp({
    answer: '',
    players: [],
    checkLetter: '',
    checkedLetters: [],
    letterNumber: null,
    useWheel: true,
    activeSectorKey: null,
    sectors: [
        {
            key: 1,
            name: 'Банкрот',
        },
        {
            key: 2,
            name: 'Приз',
        },
        {
            key: 3,
            name: '0',
        },
        {
            key: 4,
            name: 'Сектор +',
        },
        {
            key: 5,
            name: 'Задание',
        },
        {
            key: 6,
            name: 'Шанс',
        },
        {
            key: 7,
            name: '✖2',
        },
        {
            key: 8,
            name: '10',
        },
        {
            key: 9,
            name: '20',
        },
        {
            key: 10,
            name: '30',
        },
        {
            key: 11,
            name: '40',
        },
        {
            key: 12,
            name: '50',
        },
    ],

    get checkedLettersString() {
        return this.checkedLetters.join(', ');
    },

    get activeSector() {
        if (this.activeSectorKey === null) {
            return '';
        }

        return this.sectors.find(sector => sector.key === this.activeSectorKey).name;
    },

    changePlayerStatus(index) {
        this.players[index].inGame = !this.players[index].inGame;
        this.channel.postMessage({
            type: 'changePlayerStatus',
            value: JSON.stringify({
                index: index,
                value: this.players[index].inGame,
            }),
        });
    },

    changePlayerScore(index) {
        this.channel.postMessage({
            type: 'changePlayerScore',
            value: JSON.stringify({
                index: index,
                value: this.players[index].score,
            }),
        });
    },

    startGame() {
        this.checkedLetters = [];
        this.channel.postMessage({
            type: 'clear',
        });

        this.players.forEach(player => {
            player.inGame = player.name.length !== 0;
        });

        this.channel.postMessage({
            type: 'startGame',
            value: JSON.stringify({
                answer: this.answer,
                players: this.players,
                checkedLetters: this.checkedLetters,
            }),
        });
    },

    openWord() {
        this.channel.postMessage({
            type: 'openWord',
            value: this.answer.split(''),
        });
    },

    guess() {
        if (this.activeSectorKey === null ) {
            alert('Надо покрутить барабан или выбрать выпавший сектор!');
            return;
        }

        if (this.checkLetter.length === 0) {
            alert('Введите букву!');
            return;
        }

        if (this.checkedLetters.includes(this.checkLetter)) {
            this.channel.postMessage({type: 'miss'})
            this.checkLetter = '';
            return;
        }

        this.checkedLetters.push(this.checkLetter);
        this.channel.postMessage({
            type: 'guess',
            value: this.checkLetter,
        });

        if (this.checkFullAnswer()) {
            this.openWord();
        } else if (this.answer.includes(this.checkLetter)) {
            this.channel.postMessage({type: 'hit'});
        } else {
            this.channel.postMessage({type: 'miss'});
        }

        this.checkLetter = '';
    },

    openLetter() {
        if (
            this.letterNumber === null ||
            this.letterNumber > this.answer.length
        ) {
            return;
        }

        const letter = this.answer[this.letterNumber - 1];
        this.checkedLetters.push(letter);
        this.channel.postMessage({
            type: 'guess',
            value: letter,
        });

        this.letterNumber = null;

        if (this.checkFullAnswer()) {
            this.channel.postMessage({type: 'finishGame'});
        } else {
            this.channel.postMessage({
                type: 'openLetter',
                value: letter,
            });
        }
    },

    spin() {
        this.channel.postMessage({type: 'spin'});
    },

    nextTurn() {
        this.channel.postMessage({type: 'nextTurn'});
    },

    onmessage(event) {
        switch (event.data.type) {
            case 'controls:loadData':
                this.loadData(event.data.value);
                break;
            case 'controls:activeSector':
                this.activeSectorKey = event.data.value;
                break;
            default:
                break;
        }
    },

    checkFullAnswer() {
        return this.checkedLetters.reduce((carry, letter) => {
            if (this.answer.includes(letter)) {
                return carry + letter;
            }
            return carry;
        }, '').length === this.answer.length;
    },

    toggleWheel() {
        this.useWheel = !this.useWheel;
        this.channel.postMessage({
            type: 'toggleWheel',
            value: this.useWheel,
        });
    },

    chooseManual(key) {
        this.activeSectorKey = key;
        this.channel.postMessage({
            type: 'chooseManual',
            value: key,
        });
    },

    loadData(data) {
        const value = JSON.parse(data);
        this.answer = value.answer;
        this.players = value.players;
        this.checkedLetters = value.checkedLetters;
        this.useWheel = value.useWheel;
        this.activeSectorKey = value.activeSectorKey;
    },

    mounted() {
        this.channel = new BroadcastChannel(channelName);

        this.channel.onmessage = this.onmessage;

        this.channel.postMessage({type: 'loadData'});
    }
}).mount('#app');