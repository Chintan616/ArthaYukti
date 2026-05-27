import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { connectSocket, disconnectSocket, getSocket } from '../sockets/socketClient';
import { updateQuotes } from '../store/slices/stockSlice';
import { updateWatchlistQuote } from '../store/slices/watchlistSlice';

/**
 * Initialises Socket.IO connection once per session and routes incoming
 * market:update events into Redux so all components see live prices.
 * Call this once at the layout level.
 */
const useSocket = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const socket = connectSocket();

    // Broadcast from server every 30s — update quotes in Redux
    socket.on('market:update', (quotes) => {
      dispatch(updateQuotes(quotes));
      dispatch(updateWatchlistQuote(quotes));
    });

    // Targeted quote push for subscribed symbols (watchlist)
    socket.on('stock:quotes', (quotes) => {
      dispatch(updateQuotes(quotes));
      dispatch(updateWatchlistQuote(quotes));
    });

    return () => {
      socket.off('market:update');
      socket.off('stock:quotes');
      disconnectSocket();
    };
  }, [dispatch]);
};

export default useSocket;
