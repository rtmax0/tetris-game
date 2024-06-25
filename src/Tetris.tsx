import React, { useCallback, useEffect, useRef, useState } from 'react';

import styles from './Tetris.module.less';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const TICK_SPEED = 1000;

type Shape = number[][];

const SHAPES: Shape[] = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]]
];

type Board = number[][];
type Position = { x: number; y: number };

const createEmptyBoard = (): Board =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

const Tetris: React.FC = () => {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [piece, setPiece] = useState<Shape | null>(null);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const isCollision = useCallback((newPiece: Shape, newPosition: Position): boolean => {
    for (let y = 0; y < newPiece.length; y++) {
      for (let x = 0; x < newPiece[y].length; x++) {
        if (newPiece[y][x]) {
          const boardY = y + newPosition.y;
          const boardX = x + newPosition.x;
          if (
            boardY >= BOARD_HEIGHT ||
            boardX < 0 ||
            boardX >= BOARD_WIDTH ||
            (boardY >= 0 && board[boardY][boardX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }, [board]);

  const mergePieceToBoard = useCallback(() => {
    if (!piece) return;
    const newBoard = board.map(row => [...row]);
    piece.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          newBoard[y + position.y][x + position.x] = value;
        }
      });
    });
    setBoard(newBoard);
    setPiece(null);
  }, [board, piece, position]);

  const createNewPiece = useCallback(() => {
    const newPiece = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const newPosition = {
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(newPiece[0].length / 2),
      y: 0
    };
    if (isCollision(newPiece, newPosition)) {
      setGameOver(true);
      setIsPlaying(false);
    } else {
      setPiece(newPiece);
      setPosition(newPosition);
    }
  }, [isCollision]);

  const movePiece = useCallback((dx: number, dy: number): boolean => {
    if (!isPlaying || !piece) return false;
    const newPosition = { x: position.x + dx, y: position.y + dy };
    if (!isCollision(piece, newPosition)) {
      setPosition(newPosition);
      return true;
    }
    if (dy > 0) {
      mergePieceToBoard();
      return false;
    }
    return false;
  }, [isPlaying, piece, position, isCollision, mergePieceToBoard]);

  const dropPiece = useCallback(() => {
    if (!isPlaying || !piece) return;
    movePiece(0, 1);
  }, [isPlaying, piece, movePiece]);

  const rotatePiece = useCallback(() => {
    if (!isPlaying || !piece) return;
    const rotatedPiece = piece[0].map((_, index) =>
      piece.map(row => row[index]).reverse()
    );
    if (!isCollision(rotatedPiece, position)) {
      setPiece(rotatedPiece);
    }
  }, [isPlaying, piece, position, isCollision]);

  const clearLines = useCallback(() => {
    const newBoard = board.filter(row => row.some(cell => cell === 0));
    const clearedLines = BOARD_HEIGHT - newBoard.length;
    const newScore = score + clearedLines * 100;
    setScore(newScore);
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    setBoard(newBoard);
  }, [board, score]);

  const startGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setPiece(null);
    setPosition({ x: 0, y: 0 });
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  }, []);

  const gameLoop = useCallback(() => {
    if (!isPlaying) return;
    dropPiece();
  }, [isPlaying, dropPiece]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      switch (e.key) {
        case 'ArrowLeft': movePiece(-1, 0); break;
        case 'ArrowRight': movePiece(1, 0); break;
        case 'ArrowDown': dropPiece(); break;
        case 'ArrowUp': rotatePiece(); break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, movePiece, dropPiece, rotatePiece]);

  useEffect(() => {
    if (isPlaying) {
      if (!piece) {
        createNewPiece();
      }
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      gameLoopRef.current = setInterval(gameLoop, TICK_SPEED);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [isPlaying, piece, createNewPiece, gameLoop]);

  useEffect(() => {
    if (isPlaying && !piece) {
      clearLines();
      createNewPiece();
    }
  }, [isPlaying, piece, clearLines, createNewPiece]);

  const getCell = (x: number, y: number): number => {
    if (piece &&
        y >= position.y && y < position.y + piece.length &&
        x >= position.x && x < position.x + piece[0].length) {
      return piece[y - position.y][x - position.x] || board[y][x];
    }
    return board[y][x];
  };

  return (
    <div className={styles.tetrisContainer}>
      <div className={styles.scoreBoard}>Score: {score}</div>
      <div className={styles.gameBoard}>
        {board.map((row, y) => (
          <div key={y} className={styles.row}>
            {row.map((_, x) => (
              <div
                key={`${y}-${x}`}
                className={`${styles.cell} ${getCell(x, y) ? styles.filled : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      {gameOver && (
        <div className={styles.gameOver}>Game Over!</div>
      )}
      <button
        onClick={startGame}
        className={styles.startButton}
      >
        {isPlaying ? 'Restart Game' : 'Start Game'}
      </button>
      <div className={styles.debugInfo}>
        <p>Game State: {isPlaying ? 'Playing' : 'Not Playing'}</p>
        <p>Current Piece: {piece ? 'Present' : 'Not Present'}</p>
        <p>Position: ({position.x}, {position.y})</p>
      </div>
    </div>
  );
};

export default Tetris;
