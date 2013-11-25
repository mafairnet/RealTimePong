var socket,
    isFirstPlayer,
    playerName,
    opponentName,
    stage,
    ball,
    playerPaddle,
    opponentPaddle,
    $playerName,
    $opponentName,
    $playerScore,
    $opponentScore,
    $connectionCount,
    $playForm,
    $findNewOpponent,
    $playAgain,
    $action;

$(document).ready(function() {
    $connectionCount = $('span#connection-count');
    $playForm = $('form#login');
    $findNewOpponent = $('#find-new-opponent');
    $playAgain = $('#play-again');
    $action = $('#network-message');

    $playerName  = $('#player-name');
    $opponentName = $('#opponent-name');
    $playerScore = $('#player-score');
    $opponentScore = $('#opponent-score');

    $playForm.submit(findGame);
    $findNewOpponent.click(findGame);
    $playAgain.click(playAgain);
    openConnection();
});

function openConnection() {
    socket = io.connect(window.location.hostname);
    socket.on('connection_count', function (data) {
        $connectionCount.html(data.count)
    });
}

function findGame(e) {
    e.preventDefault();
    var $nameInput = $('#name');
    playerName = $nameInput.val();
    opponentName = null;
    if(playerName.length !== 0) {
        $playerName.html(playerName);
        findAnOpponent();
        showFindOpponentAnimation();
    } else {
        alert('Please enter your name.');
        $nameInput.focus();
    }
    return false;
}

function showFindOpponentAnimation() {
    $playForm.hide();
    $findNewOpponent.hide();
    $playAgain.hide();
    $action.html('Looking for opponent...');
    $action.show();
}

function findAnOpponent() {
    socket.on('game_found', onGameFound);

    socket.emit('find_game', {
        name: playerName
    });
}

function onGameFound(data) {
    opponentName = data.opponent.name;
    $opponentName.html(opponentName);
    $action.html('Opponent found. Setting up game...');
    socket.on('opponent_left', onOpponentLeft);
    isFirstPlayer = data.isFirstPlayer;
    setupGame();
    socket.removeListener('game_found', onGameFound);
}

function onOpponentLeft() {
    if(opponentName !== null) {
        $opponentName.html('');
        $opponentScore.html('');
        $playerScore.html('');
        $action.append('<br />' +opponentName + ' has left the game.');
        $playAgain.hide();
        opponentName = null;
        $findNewOpponent.show();
        destroyGame();
    }
    socket.removeListener('opponent_left', onOpponentLeft);
}

function setupGame() {
    try {
        socket.removeListener('replay', setupGame);
    } catch(e) {}
    stage = new createjs.Stage("pong");

    //Ball
    ball = new createjs.Shape();
    ball.graphics.beginFill("black").drawCircle(0, 0, 6);
    stage.addChild(ball);

    //Player Paddle
    playerPaddle = new createjs.Shape();
    playerPaddle.graphics.beginFill("black").drawRect(0, 0, 10, 100);
    playerPaddle.x = 760;
    stage.addChild(playerPaddle);

    //Opponent Paddle
    opponentPaddle = new createjs.Shape();
    opponentPaddle.graphics.beginFill("black").drawRect(0, 0, 10, 100);
    opponentPaddle.x = 30;
    stage.addChild(opponentPaddle);

    stage.update();
    $action.hide();

    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);

    socket.on('update_positions', updatePositions);
    socket.on('game_over', onGameOver);
    socket.emit('game_setup');
}

function updatePositions(data) {
    if(isFirstPlayer) {
        ball.x = data.ball_x;
        ball.y = data.ball_y;
        playerPaddle.y = data.player1_pos;
        opponentPaddle.y = data.player2_pos;
        $opponentScore.html(data.player2_score);
        $playerScore.html(data.player1_score);
    } else {
        ball.x = 800 - data.ball_x;
        ball.y = data.ball_y;
        playerPaddle.y = data.player2_pos;
        opponentPaddle.y = data.player1_pos;
        $playerScore.html(data.player2_score);
        $opponentScore.html(data.player1_score);
    }
    stage.update();
}

function keyDown(e) {
    if(e.keyCode === 87 || e.keyCode === 38) {
        socket.emit('key_down', {direction: 'up'});
    } else if(e.keyCode === 83 || e.keyCode === 40) {
        socket.emit('key_down', {direction: 'down'});
    }
}

function keyUp(e) {
    if(e.keyCode === 87 || e.keyCode === 38) {
        socket.emit('key_up', {direction: 'up'});
    } else if(e.keyCode === 83 || e.keyCode === 40) {
        socket.emit('key_up', {direction: 'down'});
    }
}

function destroyGame() {
    if(stage !== null) {
        $action.show();
        stage.removeAllChildren();
        stage.update();
        opponentPaddle = null;
        playerPaddle = null;
        ball = null;
        stage = null;
    }
    this.document.removeEventListener('keydown', keyDown);
    this.document.removeEventListener('keyup', keyUp);
    socket.removeListener('update_positions', updatePositions);
}

function onGameOver(data) {
    socket.removeListener('game_over', onGameOver);
    if(data.won) {
        $action.html('You won!');
    } else {
        $action.html(opponentName + ' won.');
    }
    $findNewOpponent.show();
    $playAgain.show();
    destroyGame();
}

function playAgain() {
    socket.on('replay', setupGame);
    $findNewOpponent.hide();
    $playAgain.hide();
    $action.html('Waiting for ' + opponentName + '...');
    socket.emit('play_again');
}
