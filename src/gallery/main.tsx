import React from 'react';
import { createRoot } from 'react-dom/client';
import Gallery from './page';
import './style.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><Gallery /></React.StrictMode>);
