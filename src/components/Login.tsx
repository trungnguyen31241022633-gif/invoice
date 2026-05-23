import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User } from 'lucide-react';
import { APP_CONFIG } from '../constants';
import { cn } from '../lib/utils';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === APP_CONFIG.ADMIN_USERNAME && password === APP_CONFIG.ADMIN_PASSWORD) {
      onLogin(username);
    } else if (username === APP_CONFIG.GUEST_USERNAME && password === APP_CONFIG.GUEST_PASSWORD) {
      onLogin(username);
    } else {
      setError('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl"
      >
        <div>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-2xl">
              <User className="text-white h-8 w-8" />
            </div>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            QuickInvoice POS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Vui lòng nhập thông tin để bắt đầu tính tiền
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                required
                className="w-full pl-11 pr-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                placeholder="Tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                className="w-full pl-11 pr-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Đăng nhập
          </button>
        </form>

        <div className="text-center text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-100">
          <p>Admin: <span className="font-mono bg-gray-100 px-1 rounded">admin / 123</span></p>
          <p>Khách: <span className="font-mono bg-gray-100 px-1 rounded">guest / 123</span></p>
        </div>
      </motion.div>
    </div>
  );
}
