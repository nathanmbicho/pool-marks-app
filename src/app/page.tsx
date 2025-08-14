"use client"

import React, {useEffect, useState} from 'react';
import {Check, Clock, DollarSign, Edit3, History, Minus, Play, Plus, Square, Trophy, Users, X} from 'lucide-react';

interface CarryForwardType {
  player: string;
  amount: number;
}

interface GameResultType {
  winner: string;
  paidPlayers: string[];
  carryForwards: CarryForwardType[];
}

interface GameType {
  gameNumber: number;
  players: string[];
  stake: number;
  startTime: string;
  endTime?: string;
  winner?: string;
  paidPlayers?: string[];
  carryForwards?: CarryForwardType[];
  fees?: {
    chalk: number;
    table: number;
  };
}

interface SessionType {
  id: string;
  startTime: string;
  games: GameType[];
  players: Array<{
    name: string;
    balance: number;
    totalWins: number;
    totalLosses: number;
  }>;
  currentStake: number;
  chalkFee: number;
  tableFee: number;
}

const PoolMarksApp = () => {
  const [sessions, setSessions] = useState<SessionType[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionType | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const [showGameResult, setShowGameResult] = useState(false);
  const [editingBalances, setEditingBalances] = useState(false);

  // New Session Form
  const [newSessionData, setNewSessionData] = useState({
    players: ['', '', '', ''],
    stakeAmount: 100,
    chalkFee: 30,
    tableFee: 20
  });

  // Game Result Form
  const [gameResult, setGameResult] = useState<GameResultType>({
    winner: '',
    paidPlayers: [],
    carryForwards: []
  });

  useEffect(() => {
    const saved = localStorage.getItem('poolSessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('poolSessions', JSON.stringify(sessions));
  }, [sessions]);

  const createNewSession = () => {
    const validPlayers = newSessionData.players.filter(p => p.trim());
    if (validPlayers.length < 2) {
      alert('Need at least 2 players to start a session');
      return;
    }

    const session: SessionType = {
      id: `Session_${sessions.length + 1}`,
      startTime: new Date().toLocaleString(),
      games: [],
      players: validPlayers.map(name => ({
        name: name.trim(),
        balance: 0, // positive = credit, negative = debt
        totalWins: 0,
        totalLosses: 0
      })),
      currentStake: newSessionData.stakeAmount,
      chalkFee: newSessionData.chalkFee,
      tableFee: newSessionData.tableFee
    };

    setSessions([...sessions, session]);
    setCurrentSession(session);
    setShowNewSession(false);
    setNewSessionData({
      players: ['', '', '', ''],
      stakeAmount: 100,
      chalkFee: 30,
      tableFee: 20
    });
  };

  const startGame = () => {
    if (!currentSession) return;

    setCurrentGame({
      gameNumber: currentSession.games.length + 1,
      players: currentSession.players.map(p => p.name),
      stake: currentSession.currentStake,
      startTime: new Date().toLocaleString()
    });
    setGameInProgress(true);
  };

  const endGame = () => {
    setGameInProgress(false);
    setShowGameResult(true);
    setGameResult({
      winner: '',
      paidPlayers: [],
      carryForwards: []
    });
  };

  const confirmGame = () => {
    if (!gameResult.winner) {
      alert('Please select a winner');
      return;
    }

    if (!currentSession || !currentGame) {
      return;
    }

    const totalFees = currentSession.chalkFee + currentSession.tableFee;
    const totalPlayers = currentSession.players.length;

    // Winner always gets (total players × stake) - fees
    const winnerPayout = (totalPlayers * currentSession.currentStake) - totalFees;

    // Update player balances
    const updatedPlayers = currentSession.players.map(player => {
      const newPlayer = {...player};

      if (player.name === gameResult.winner) {
        // Winner gets full payout
        newPlayer.balance += winnerPayout;
        newPlayer.totalWins += 1;

        // If the winner hadn't paid for this game, deduct stake from winnings
        if (!gameResult.paidPlayers.includes(player.name)) {
          newPlayer.balance -= currentSession.currentStake;
        }
      } else {
        // For losing players
        const carryForward = gameResult.carryForwards.find(cf => cf.player === player.name);
        const paidImmediately = gameResult.paidPlayers.includes(player.name);

        if (carryForward) {
          // Player was carried forward - their previous stake moves to the next game
          // No balance change - debt stays the same amount as carry forward
          // The carry forward amount will be their stake for the next game
          newPlayer.balance -= currentSession.currentStake - carryForward.amount;
        } else if (!paidImmediately) {
          // Player didn't pay and wasn't carried forward - add debt
          newPlayer.balance -= currentSession.currentStake;
        }
        // If the player paid immediately, no balance change needed

        newPlayer.totalLosses += 1;
      }

      return newPlayer;
    });

    // Create a game record
    const gameRecord: GameType = {
      gameNumber: currentGame.gameNumber,
      players: currentGame.players,
      stake: currentSession.currentStake,
      winner: gameResult.winner,
      paidPlayers: gameResult.paidPlayers,
      carryForwards: gameResult.carryForwards,
      startTime: currentGame.startTime,
      endTime: new Date().toLocaleString(),
      fees: { chalk: currentSession.chalkFee, table: currentSession.tableFee }
    };

    // Update session
    const updatedSession: SessionType = {
      ...currentSession,
      players: updatedPlayers,
      games: [...currentSession.games, gameRecord]
    };

    // Update sessions array
    const updatedSessions = sessions.map(s =>
        s.id === currentSession.id ? updatedSession : s
    );

    setSessions(updatedSessions);
    setCurrentSession(updatedSession);
    setShowGameResult(false);
    setCurrentGame(null);
  };

  const updateSessionSettings = <K extends keyof SessionType>(
      field: K,
      value: SessionType[K]
  ) => {
    if (!currentSession) return;

    const updatedSession = { ...currentSession, [field]: value };
    setCurrentSession(updatedSession);

    const updatedSessions = sessions.map(s =>
        s.id === currentSession.id ? updatedSession : s
    );
    setSessions(updatedSessions);
  };

  const addPlayer = () => {
    if (!currentSession) return;

    const playerName = prompt('Enter new player name:');
    if (playerName && playerName.trim()) {
      const newPlayer = {
        name: playerName.trim(),
        balance: 0,
        totalWins: 0,
        totalLosses: 0
      };

      const updatedSession: SessionType = {
        ...currentSession,
        players: [...currentSession.players, newPlayer]
      };

      setCurrentSession(updatedSession);
      const updatedSessions = sessions.map(s =>
          s.id === currentSession.id ? updatedSession : s
      );
      setSessions(updatedSessions);
    }
  };

  const removePlayer = (playerName: string) => {
    if (!currentSession) return;

    if (currentSession.players.length <= 2) {
      alert('Need at least 2 players in session');
      return;
    }

    if (confirm(`Remove ${playerName} from session?`)) {
      const updatedSession: SessionType = {
        ...currentSession,
        players: currentSession.players.filter(p => p.name !== playerName)
      };

      setCurrentSession(updatedSession);
      const updatedSessions = sessions.map(s =>
          s.id === currentSession.id ? updatedSession : s
      );
      setSessions(updatedSessions);
    }
  };

  const updatePlayerBalance = (playerName: string, newBalance: number) => {
    if (!currentSession) return;

    const updatedSession: SessionType = {
      ...currentSession,
      players: currentSession.players.map(p =>
          p.name === playerName ? { ...p, balance: newBalance } : p
      )
    };

    setCurrentSession(updatedSession);
    const updatedSessions = sessions.map(s =>
        s.id === currentSession.id ? updatedSession : s
    );
    setSessions(updatedSessions);
  };

  if (showNewSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-emerald-500 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">New Pool Session</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Players</label>
                <div className="grid grid-cols-2 gap-3">
                  {newSessionData.players.map((player, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`Player ${idx + 1}${idx < 2 ? ' (Required)' : ''}`}
                      value={player}
                      onChange={(e) => {
                        const updated = [...newSessionData.players];
                        updated[idx] = e.target.value;
                        setNewSessionData({...newSessionData, players: updated});
                      }}
                      className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      required={idx < 2}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Stake Amount (KES)</label>
                  <input
                    type="number"
                    value={newSessionData.stakeAmount}
                    onChange={(e) => setNewSessionData({...newSessionData, stakeAmount: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Chalk Fee (KES)</label>
                  <input
                    type="number"
                    value={newSessionData.chalkFee}
                    onChange={(e) => setNewSessionData({...newSessionData, chalkFee: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Table Fee (KES)</label>
                  <input
                    type="number"
                    value={newSessionData.tableFee}
                    onChange={(e) => setNewSessionData({...newSessionData, tableFee: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  onClick={createNewSession}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  Start Session
                </button>
                <button
                  onClick={() => setShowNewSession(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-4 px-6 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showGameResult && currentGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-amber-500 rounded-xl">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Game {currentGame.gameNumber} Results</h2>
            </div>

            <div className="space-y-6">
              {/* Winner Selection */}
              {currentSession && (
              <div>
                <label className="block text-lg font-semibold text-slate-300 mb-3">Winner</label>
                <div className="grid grid-cols-2 gap-3">
                  {currentSession.players.map(player => (
                    <button
                      key={player.name}
                      onClick={() => setGameResult({...gameResult, winner: player.name})}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        gameResult.winner === player.name
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <Trophy className="w-5 h-5 mx-auto mb-2" />
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm opacity-75">Balance: {player.balance >= 0 ? `+${player.balance}` : player.balance} KES</div>
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* Payment Status */}
              {currentSession && (
              <div>
                <label className="block text-lg font-semibold text-slate-300 mb-3">Paid Players</label>
                <div className="grid grid-cols-2 gap-3">
                  {currentSession.players.map(player => (
                    <button
                      key={player.name}
                      onClick={() => {
                        const paid = gameResult.paidPlayers.includes(player.name);
                        if (paid) {
                          setGameResult({
                            ...gameResult,
                            paidPlayers: gameResult.paidPlayers.filter(p => p !== player.name)
                          });
                        } else {
                          setGameResult({
                            ...gameResult,
                            paidPlayers: [...gameResult.paidPlayers, player.name]
                          });
                        }
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        gameResult.paidPlayers.includes(player.name)
                          ? 'border-green-500 bg-green-500/20 text-green-300'
                          : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <Check className="w-5 h-5 mx-auto mb-2" />
                      <div className="font-semibold">{player.name}</div>
                      <div className="text-sm opacity-75">Owes: {currentSession.currentStake} KES</div>
                    </button>
                  ))}
                </div>
              </div>

              )}

              {/* Carry Forwards */}
              {currentSession && (
              <div>
                <label className="block text-lg font-semibold text-slate-300 mb-3">Carry Forward (Optional)</label>
                <div className="space-y-3">
                  {currentSession.players.filter(p => p.name !== gameResult.winner).map(player => {
                    const existing = gameResult.carryForwards.find(cf => cf.player === player.name);
                    return (
                      <div key={player.name} className="flex items-center gap-4 bg-slate-700 p-4 rounded-lg">
                        <div className="flex-1">
                          <div className="font-semibold text-white">{player.name}</div>
                          <div className="text-sm text-slate-400">Current balance: {player.balance >= 0 ? `+${player.balance}` : player.balance} KES</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="0"
                            value={existing?.amount || ''}
                            onChange={(e) => {
                              const amount = Number(e.target.value) || 0;
                              const updated = gameResult.carryForwards.filter(cf => cf.player !== player.name);
                              if (amount > 0) {
                                updated.push({ player: player.name, amount });
                              }
                              setGameResult({...gameResult, carryForwards: updated});
                            }}
                            className="w-24 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-center"
                            max={currentSession.currentStake}
                          />
                          <span className="text-slate-400 text-sm">KES</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              <div className="flex gap-3 pt-6">
                <button
                  onClick={confirmGame}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition-all"
                >
                  Confirm Game
                </button>
                <button
                  onClick={() => setShowGameResult(false)}
                  className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-4 px-6 rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 bg-slate-800 rounded-2xl px-6 py-4 mb-6 shadow-xl border border-slate-700">
              <h1 className="text-4xl font-bold text-white">🎱 Pool Tracker 🎱</h1>
            </div>
            <p className="text-slate-400 text-lg">Manage your pool table game sessions and player balances</p>
          </div>

          {/* New Session Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setShowNewSession(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center gap-3"
            >
              <Plus className="w-6 h-6" />
              Start New Session
            </button>
          </div>

          {/* Previous Sessions */}
          {sessions.length > 0 && (
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <History className="w-6 h-6 text-emerald-500" />
                Recent Sessions
              </h3>
              <div className="space-y-4">
                {sessions.slice(-5).reverse().map(session => (
                  <div
                    key={session.id}
                    onClick={() => setCurrentSession(session)}
                    className="bg-slate-700 hover:bg-slate-600 p-6 rounded-xl cursor-pointer transition-all border border-slate-600 hover:border-emerald-500"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-semibold text-white">{session.id}</h4>
                        <p className="text-slate-400">Started: {session.startTime}</p>
                        <p className="text-slate-300">Players: {session.players.map(p => p.name).join(', ')}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400">{session.games.length}</div>
                        <div className="text-slate-400">Games</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentSession(null)}
              className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{currentSession.id}</h1>
              <p className="text-slate-400">Started: {currentSession.startTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-sm">Games Played: </span>
              <span className="text-white font-bold">{currentSession.games.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Control Panel */}
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-emerald-500" />
              Game Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Stake Amount (KES)</label>
                <input
                  type="number"
                  value={currentSession.currentStake}
                  onChange={(e) => updateSessionSettings('currentStake', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  disabled={gameInProgress}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Chalk Fee</label>
                  <input
                    type="number"
                    value={currentSession.chalkFee}
                    onChange={(e) => updateSessionSettings('chalkFee', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    disabled={gameInProgress}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Table Fee</label>
                  <input
                    type="number"
                    value={currentSession.tableFee}
                    onChange={(e) => updateSessionSettings('tableFee', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    disabled={gameInProgress}
                  />
                </div>
              </div>

              <div className="pt-4">
                {!gameInProgress ? (
                  <button
                    onClick={startGame}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Start Game {currentSession.games.length + 1}
                  </button>
                ) : (
                  <button
                    onClick={endGame}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Square className="w-5 h-5" />
                    End Game {currentGame ? currentGame.gameNumber : ''}
                  </button>
                )}

              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={addPlayer}
                  disabled={gameInProgress}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Player
                </button>
              </div>
            </div>
          </div>

          {/* Players Panel */}
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Users className="w-6 h-6 text-emerald-500" />
                Players ({currentSession.players.length})
              </h2>
              <button
                onClick={() => setEditingBalances(!editingBalances)}
                className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-all"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {currentSession.players.map(player => (
                <div key={player.name} className="bg-slate-700 p-4 rounded-xl border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{player.name}</h3>
                    {!gameInProgress && (
                      <button
                        onClick={() => removePlayer(player.name)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-slate-400">Balance</div>
                      <div className={`font-bold ${player.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {player.balance >= 0 ? `+${player.balance}` : player.balance} KES
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Wins</div>
                      <div className="font-bold text-emerald-400">{player.totalWins}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Losses</div>
                      <div className="font-bold text-red-400">{player.totalLosses}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game History */}
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <History className="w-6 h-6 text-emerald-500" />
              Game History
            </h2>

            {gameInProgress && currentGame && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                  <Clock className="w-4 h-4" />
                  Game {currentGame.gameNumber} In Progress
                </div>
                <div className="text-sm text-amber-300">
                  Started: {currentGame.startTime}
                </div>
                <div className="text-sm text-amber-300">
                  Stake: {currentGame.stake} KES
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {currentSession.games.slice().reverse().map(game => (
                <div key={game.gameNumber} className="bg-slate-700 p-4 rounded-xl border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white">Game {game.gameNumber}</span>
                    </div>
                    <div className="text-xs text-slate-400">{game.endTime}</div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-slate-400">All Players: </span>
                      <span className="text-gray-300 font-semibold">{game.players.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Winner: </span>
                      <span className="text-emerald-400 font-semibold">{game.winner} - {
                        (() => {
                          if (!game.players.length || !game.stake || !game.fees || !game.winner) return 'N/A';

                          // Total pot minus fees
                          const totalPayout = (game.players.length * game.stake) - (game.fees.chalk + game.fees.table);

                          // Subtract carry forwards winner paid
                          const totalCarryForwards = game.carryForwards?.reduce((sum, cf) => sum + cf.amount, 0) || 0;

                          // Subtract stake if the winner hadn't paid
                          const winnerPaid = game.paidPlayers?.includes(game.winner) || false;
                          const stakeDeduction = winnerPaid ? 0 : game.stake;

                          return totalPayout - totalCarryForwards - stakeDeduction;
                        })()
                      }</span>
                    </div>
                    <div>
                      <span className="text-slate-400">ChalkMan Fee: </span>
                      <span className="text-white">{game.fees?.chalk + game.fees?.table} KES</span>
                    </div>
                    {game.paidPlayers && game.paidPlayers.length > 0 && (
                      <div>
                        <span className="text-slate-400">Paid: </span>
                        <span className="text-green-400">{game.paidPlayers.join(', ')}</span>
                      </div>
                    )}
                    {game.carryForwards && game.carryForwards.length > 0 && (
                      <div>
                        <span className="text-slate-400">Carried: </span>
                        <span className="text-blue-400">
                          {game.carryForwards.map(cf => `${cf.player} (${cf.amount})`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {currentSession.games.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No games played yet</p>
                  <p className="text-sm">Start your first game to see history here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Session Summary</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">
                {currentSession.games.length}
              </div>
              <div className="text-slate-400">Games Played</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400">
                {currentSession.chalkFee + currentSession.tableFee} KES
              </div>
              <div className="text-slate-400">Chalk Man Fees</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">
                {currentSession.currentStake} KES
              </div>
              <div className="text-slate-400">Current Stake</div>
            </div>
          </div>

          {/* Balance Summary */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Balance Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2">Player</th>
                  <th className="text-center py-3 px-2">Balance</th>
                  <th className="text-center py-3 px-2">Wins</th>
                  <th className="text-center py-3 px-2">Losses</th>
                  <th className="text-center py-3 px-2">Actions</th>
                </tr>
                </thead>
                <tbody>
                {currentSession.players.map(player => {
                  // Calculate current balance including ongoing game
                  let currentBalance = player.balance;

                  if (gameInProgress && currentGame) {
                    // If there's a game in progress, the player owes the stake (unless they've already paid or are carried forward)
                    // This shows what their balance would be if they lose and don't pay
                    currentBalance = player.balance - currentSession.currentStake;
                  }

                  return (
                      <tr key={player.name} className="border-b border-gray-100">
                        <td className="py-3 px-2 font-medium">
                          {player.name}
                          {gameInProgress && <span className="ml-2 text-xs text-blue-600">(in game)</span>}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {editingBalances ? (
                              <input
                                  type="number"
                                  value={player.balance}
                                  onChange={(e) => updatePlayerBalance(player.name, Number(e.target.value))}
                                  className="w-20 p-1 border border-gray-300 rounded text-center text-sm"
                              />
                          ) : (
                              <div>
                              <span className={player.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {player.balance >= 0 ? '+' : ''}{player.balance}
                              </span>
                                {gameInProgress && (
                                    <div className="text-xs text-gray-500">
                                      (→ {currentBalance >= 0 ? '+' : ''}{currentBalance})
                                    </div>
                                )}
                              </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center text-green-600">{player.totalWins}</td>
                        <td className="py-3 px-2 text-center text-red-600">{player.totalLosses}</td>
                        <td className="py-3 px-2 text-center">
                          <button
                              onClick={() => removePlayer(player.name)}
                              className="text-red-500 hover:text-red-700 text-sm"
                              disabled={gameInProgress}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoolMarksApp;