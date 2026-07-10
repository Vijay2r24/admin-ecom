import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, ERROR_MESSAGES } from '../contants/constants';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('token');
    if (!isLoggedIn) {
      return THEMES.LIGHT; // Always light theme for login page
    }
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || THEMES.LIGHT;
  });

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('token');
    
    // Apply theme to document root only if logged in
    const root = document.documentElement;
    
    if (!isLoggedIn) {
      // Force light theme on login page
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
      return;
    }
    
    if (theme === THEMES.DARK) {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#000000';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
    }
    
    // Save theme preference only if logged in
    if (isLoggedIn) {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    // Only allow theme toggle if logged in
    const isLoggedIn = localStorage.getItem('token');
    if (!isLoggedIn) return;
    
    setTheme(prevTheme => prevTheme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error(ERROR_MESSAGES.THEME_PROVIDER_REQUIRED);
  }
  return context;
};
