import {createApp} from 'https://unpkg.com/petite-vue?module';
import './confetti.js';

function Char(props) {
    return {
        char: props.char,
        checkedLetters: props.checkedLetters,
        $template: '#char-template',

        get cardClassName() {
            if (this.checkedLetters.includes(this.char)) {
                return 'card card--open';
            }
        },
    }
}

function Player(props, index) {
    return {
        index: index,
        player: props,
        $template: '#player-template',

        get playerClassName() {
            const className = ['player', 'player-' + index];

            if (!this.player.inGame) {
                className.push('out-of-game');
            }

            return className.join(' ');
        },
    };
}

const channelName = 'controlChannel';
const fadeOutThreshold = 0.7;
const duration = 6000;

const hit = document.querySelector('#hit');
const miss = document.querySelector('#miss');
const fail = document.querySelector('#fail');
const win = document.querySelector('#win');
const run = document.querySelector('#run');

function transition(cb) {
    document.startViewTransition(() => {
        cb()
    });
}

function shuffle(array) {
    let currentIndex = array.length;

    while (currentIndex !== 0) {

        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}

function getActiveSector(container, initialOffset = 4) {
    const listItems = document.querySelectorAll('.wheel-of-fortune li');
    // Получаем текущий угол поворота контейнера
    const containerStyle = window.getComputedStyle(container);
    const transform = containerStyle.transform;

    if (!transform || transform === 'none') {
        return listItems[initialOffset % listItems.length];
    }

    // Извлекаем угол из матрицы трансформации
    const matrix = new DOMMatrix(transform);
    const angle = Math.atan2(matrix.m21, matrix.m11) * (180 / Math.PI);

    // Нормализуем угол (0-360 градусов)
    const normalizedAngle = (angle < 0 ? 360 + angle : angle) % 360;

    // Рассчитываем угол между секторами
    const sectorAngle = 360 / listItems.length;

    // Учитываем начальное смещение (индекс начального сектора вверху)
    const adjustedAngle = (normalizedAngle + initialOffset * sectorAngle) % 360;

    // Определяем активный сектор
    const activeIndex = Math.round(adjustedAngle / sectorAngle) % listItems.length;

    return listItems[activeIndex];
}

function fadeVolume(audio) {
    const progress = audio.currentTime / audio.duration;

    if (progress > fadeOutThreshold) {
        const fadeProgress = (progress - fadeOutThreshold) / (1 - fadeOutThreshold);
        audio.volume = 1 - fadeProgress;
    }

    if (progress < 1) {
        requestAnimationFrame(() => fadeVolume(audio));
    } else {
        audio.volume = 0;
    }
}

createApp({
    answer: '',
    players: [
        {name: '', score: 0, inGame: true, active: false, win: false},
        {name: '', score: 0, inGame: true, active: false, win: false},
        {name: '', score: 0, inGame: true, active: false, win: false},
        {name: '', score: 0, inGame: true, active: false, win: false},
    ],
    checkedLetters: [],
    manualMessage: '',
    activeSectorKey: null,

    missShow: false,
    hitShow: false,
    failShow: false,
    manualShow: false,

    useWheel: true,
    wheelElement: null,
    wheelArrowElement: null,
    sectors: [
        {
            key: 1,
            name: 'Б',
            value: 0,
            multiply: 1,
            willGuess: false,
        },
        {
            key: 2,
            name: 'П',
            value: 0,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 3,
            name: '0',
            value: 0,
            multiply: 1,
            willGuess: false,
        },
        {
            key: 4,
            name: '+',
            value: 0,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 5,
            name: 'З',
            value: 0,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 6,
            name: 'Ш',
            value: 0,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 7,
            name: '✖2',
            value: 0,
            multiply: 2,
            willGuess: true,
        },
        {
            key: 8,
            name: '10',
            value: 10,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 9,
            name: '20',
            value: 20,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 10,
            name: '30',
            value: 30,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 11,
            name: '40',
            value: 40,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 12,
            name: '50',
            value: 50,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 13,
            name: '10',
            value: 10,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 14,
            name: '20',
            value: 20,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 15,
            name: '30',
            value: 30,
            multiply: 1,
            willGuess: true,
        },
        {
            key: 16,
            name: '40',
            value: 40,
            multiply: 1,
            willGuess: true,
        },
    ],
    animation: null,
    previousEndDegree: 0,

    Char,
    Player,

    openControls() {
        window.open(
            './controls.html',
            'ControlWindow',
            'width=400,height=300'
        );
    },

    updateVolume(audio) {
        const progress = this.animation.currentTime / duration;

        if (progress > fadeOutThreshold) {
            const fadeProgress = (progress - fadeOutThreshold) / (1 - fadeOutThreshold);
            audio.volume = 1 - fadeProgress;
        }

        if (progress < 1) {
            requestAnimationFrame(this.updateVolume.bind(this, audio));
        } else {
            audio.volume = 0;
        }
    },

    spin(cb) {
        if (this.animation && this.animation.playState !== 'finished') {
            return;
        }

        const minDegrees = 1800;
        const maxDegrees = 3600;
        const randomAdditionalDegrees = Math.random() * (maxDegrees - minDegrees) + minDegrees;
        const newEndDegree = this.previousEndDegree + randomAdditionalDegrees;

        this.animation = this.wheelElement.animate([
            {transform: `rotate(${this.previousEndDegree}deg)`},
            {transform: `rotate(${newEndDegree}deg)`}
        ], {
            duration: duration,
            direction: 'normal',
            easing: 'cubic-bezier(0.440, -0.205, 0.000, 1)',
            fill: 'forwards',
            iterations: 1
        });

        run.volume = 1;
        run.currentTime = 0;
        run.play();
        this.updateVolume(run);

        this.animation.addEventListener('finish', () => {
            cb();
            run.pause();
        }, {once: true});

        this.previousEndDegree = newEndDegree;
    },

    nextTurn() {
        const currentPlayerIndex = this.players.findIndex(player => player.active);
        const activePlayers = this.players.filter(player => player.inGame);

        if (activePlayers.length === 0) {
            return;
        }

        if (currentPlayerIndex === -1) {
            activePlayers[0].active = true;
            return;
        }

        let nextPlayerIndex = (currentPlayerIndex + 1) % this.players.length;
        while (!this.players[nextPlayerIndex].inGame) {
            nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
        }

        this.players[currentPlayerIndex].active = false;
        this.players[nextPlayerIndex].active = true;
    },

    calculateScore(lettersCount = 1) {
        const sector = this.sectors.find(sector => sector.key === this.activeSectorKey);

        const activePlayer = this.players.find(player => player.active);
        activePlayer.score = (activePlayer.score + sector.value * lettersCount) * sector.multiply;
    },

    maybeResetScore(sector) {
        if (sector.key === 1) {
            const activePlayer = this.players.find(player => player.active);
            activePlayer.score = 0;
        }
    },

    showPlayer(index) {
        return this.players[index].name.length > 0;
    },

    finishGame() {
        confetti.start(10000);
        win.currentTime = 0;
        win.volume = 1;
        win.play();
        fadeVolume(win)
        const activePlayer = this.players.find(player => player.active);
        activePlayer.active = false;
        activePlayer.win = true;
    },

    onmessage(event) {
        switch (event.data.type) {
            case 'loadData':
                this.channel.postMessage({
                    type: 'controls:loadData',
                    value: JSON.stringify({
                        answer: this.answer,
                        players: this.players,
                        checkedLetters: this.checkedLetters,
                        useWheel: this.useWheel,
                        activeSectorKey: this.activeSectorKey,
                    })
                })
                break;

            case 'clear':
                this.answer = '';
                this.checkedLetters = [];
                break;

            case 'startGame':
                const value = JSON.parse(event.data.value);
                this.answer = value.answer;

                value.players.forEach(({name, inGame, score}, index) => {
                    let currentPlayer = this.players[index];

                    currentPlayer.name = name;
                    currentPlayer.inGame = inGame;
                    currentPlayer.win = false;
                    currentPlayer.score = score;
                    currentPlayer.active = false;
                });
                this.players[0].active = true;
                shuffle(this.sectors);
                break;

            case 'changePlayerStatus': {
                const data = JSON.parse(event.data.value);
                this.players[data.index].inGame = data.value;
                break;
            }

            case 'changePlayerScore': {
                const data = JSON.parse(event.data.value);
                this.players[data.index].score = data.value;
                break;
            }

            case 'toggleWheel':
                this.useWheel = JSON.parse(event.data.value);
                break;

            case 'guess':
                this.checkedLetters.push(event.data.value);
                break;

            case 'spin':
                this.spin(() => {
                    this.activeSectorKey = getActiveSector(this.wheelElement).value;
                    const sector = this.sectors.find(sector => sector.key === this.activeSectorKey);

                    this.channel.postMessage({
                        type: 'controls:activeSector',
                        value: this.activeSectorKey,
                    });

                    if (sector.willGuess) {
                        return;
                    }

                    this.maybeResetScore(sector);

                    transition(() => this.failShow = true);
                    fail.play();
                    setTimeout(() => {
                        transition(() => this.failShow = false);
                        this.nextTurn();
                    }, 2000);
                });
                break;

            case 'chooseManual': {
                this.activeSectorKey = JSON.parse(event.data.value);
                const sector = this.sectors.find(sector => sector.key === this.activeSectorKey);

                transition(() => {
                    this.manualMessage = sector.name;
                    this.manualShow = true;
                });

                setTimeout(() => {
                    transition(() => this.manualShow = false);

                    if (sector.willGuess) {
                        return;
                    }

                    this.maybeResetScore(sector);

                    transition(() => this.failShow = true);
                    fail.play();
                    setTimeout(() => {
                        transition(() => this.failShow = false);
                        this.nextTurn();
                    }, 2000);
                }, 2000);
                break;
            }

            case 'nextTurn':
                this.nextTurn();
                break;

            case 'miss':
                transition(() => this.missShow = true);
                miss.play();
                setTimeout(() => {
                    transition(() => this.missShow = false);
                    this.nextTurn();
                }, 1500);

                break;

            case 'hit':
                transition(() => this.hitShow = true);
                hit.play();
                const countOfGuessedLetters = this.answer.split('')
                    .filter(letter => letter === this.checkedLetters[this.checkedLetters.length - 1])
                    .length;

                this.calculateScore(countOfGuessedLetters);
                setTimeout(() => {
                    transition(() => this.hitShow = false);
                }, 1000);
                break;

            case 'openLetter':
                transition(() => this.hitShow = true);
                hit.play();
                setTimeout(() => {
                    transition(() => this.hitShow = false);
                }, 1000);
                break;

            case 'openWord':
                event.data.value.forEach((letter, index) => {
                    setTimeout(() => this.checkedLetters.push(letter), 200 * index);
                });
                this.finishGame();
                break;

            case 'finishGame':
                this.finishGame();
                break;

            default:
                break;
        }
    },

    mounted() {
        window.game = this;
        this.channel = new BroadcastChannel(channelName);
        this.channel.onmessage = this.onmessage;
        this.wheelElement = document.querySelector('.ui-wheel-of-fortune');
        this.wheelArrowElement = document.querySelector('.ui-wheel-of-fortune-wrapper .arrow');
    }
}).mount('#app');
