import {Buffer} from 'buffer';
(window as unknown as {Buffer:typeof Buffer}).Buffer=Buffer;
import React from 'react';
import {createRoot} from 'react-dom/client';
import './ui/style.css';
// Load Solana modules after the Buffer global is installed.
void import('./ui/App').then(({App})=>createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)).catch(error=>{document.getElementById('root')!.textContent=`Deep Search could not start: ${error instanceof Error?error.message:String(error)}`;});
